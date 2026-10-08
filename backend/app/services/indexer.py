"""Indice vetorial local com ChromaDB e reindexacao incremental por hash de arquivo."""

import hashlib
import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import chromadb

from ..config import CHROMA_DIR, MANIFEST_FILE, ensure_dirs
from ..schemas import IndexStatus, Source
from .chunker import chunk_blocks
from .parsers import extract_text
from .sources.base import KnowledgeSource, SourceFile

COLLECTION_NAME = "knowledge"


def _file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


class Indexer:
    def __init__(self) -> None:
        ensure_dirs()
        self._client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        self._collection = self._client.get_or_create_collection(
            COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
        )
        self._lock = threading.Lock()
        self._manifest: dict[str, dict[str, Any]] = self._load_manifest()
        self.status = IndexStatus(
            documents=len(self._manifest),
            chunks=sum(entry.get("chunks", 0) for entry in self._manifest.values()),
            last_indexed_at=self._last_indexed_from_manifest(),
        )

    # ---------- manifest ----------

    def _load_manifest(self) -> dict[str, dict[str, Any]]:
        if not MANIFEST_FILE.exists():
            return {}
        try:
            return json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}

    def _save_manifest(self) -> None:
        MANIFEST_FILE.write_text(
            json.dumps(self._manifest, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    def _last_indexed_from_manifest(self) -> Optional[str]:
        stamps = [entry.get("indexed_at") for entry in self._manifest.values() if entry.get("indexed_at")]
        return max(stamps) if stamps else None

    # ---------- indexacao ----------

    def _remove_file(self, relative: str) -> None:
        entry = self._manifest.pop(relative, None)
        if entry:
            self._collection.delete(where={"file": relative})

    def _index_file(self, source_file: SourceFile, file_hash: str) -> int:
        blocks = extract_text(source_file.path)
        chunks = chunk_blocks(blocks)
        # remove versao anterior (se houver) antes de inserir a nova
        self._collection.delete(where={"file": source_file.relative})
        if not chunks:
            self._manifest[source_file.relative] = {
                "hash": file_hash,
                "chunks": 0,
                "indexed_at": datetime.now().isoformat(timespec="seconds"),
            }
            return 0
        ids = [f"{file_hash}:{chunk.index}" for chunk in chunks]
        documents = [chunk.text for chunk in chunks]
        metadatas: list[dict[str, Any]] = []
        for chunk in chunks:
            meta: dict[str, Any] = {"file": source_file.relative, "chunk_index": chunk.index}
            if chunk.page is not None:
                meta["page"] = chunk.page
            metadatas.append(meta)
        # Chroma limita o tamanho dos lotes; 200 e seguro.
        batch = 200
        for start in range(0, len(ids), batch):
            self._collection.upsert(
                ids=ids[start : start + batch],
                documents=documents[start : start + batch],
                metadatas=metadatas[start : start + batch],
            )
        self._manifest[source_file.relative] = {
            "hash": file_hash,
            "chunks": len(chunks),
            "indexed_at": datetime.now().isoformat(timespec="seconds"),
        }
        return len(chunks)

    def reindex(self, source: KnowledgeSource) -> IndexStatus:
        if not self._lock.acquire(blocking=False):
            return self.status
        try:
            self.status = IndexStatus(state="indexing", message="Listando arquivos...")
            listing = source.list_files()
            current = {f.relative for f in listing.files}

            # remove do indice o que sumiu da pasta
            for relative in list(self._manifest.keys()):
                if relative not in current:
                    self._remove_file(relative)

            empty: list[str] = []
            errors: list[str] = []
            total = len(listing.files)
            for position, source_file in enumerate(listing.files, start=1):
                self.status.message = f"Indexando {position}/{total}: {source_file.relative}"
                file_hash = _file_hash(source_file.path)
                previous = self._manifest.get(source_file.relative)
                if previous and previous.get("hash") == file_hash:
                    if previous.get("chunks", 0) == 0:
                        empty.append(source_file.relative)
                    continue
                try:
                    count = self._index_file(source_file, file_hash)
                    if count == 0:
                        empty.append(source_file.relative)
                except Exception as exc:  # arquivo corrompido, protegido etc.
                    errors.append(f"{source_file.relative}: {exc}")
                self._save_manifest()

            self._save_manifest()
            message = "Indexacao concluida."
            if errors:
                message += " Erros: " + "; ".join(errors[:5])
            self.status = IndexStatus(
                state="idle",
                message=message,
                documents=len(self._manifest),
                chunks=sum(entry.get("chunks", 0) for entry in self._manifest.values()),
                last_indexed_at=datetime.now().isoformat(timespec="seconds"),
                ignored_files=listing.ignored,
                empty_files=empty,
            )
        except Exception as exc:
            self.status = IndexStatus(
                state="error",
                message=str(exc),
                documents=len(self._manifest),
                chunks=sum(entry.get("chunks", 0) for entry in self._manifest.values()),
                last_indexed_at=self._last_indexed_from_manifest(),
            )
        finally:
            self._lock.release()
        return self.status

    def index_single_file(self, source: KnowledgeSource, path: Path) -> int:
        """Indexa um unico arquivo (usado ao salvar um chat na base)."""
        relative = path.resolve().relative_to(source.root()).as_posix()
        source_file = SourceFile(path=path, relative=relative)
        with self._lock:
            count = self._index_file(source_file, _file_hash(path))
            self._save_manifest()
            self.status.documents = len(self._manifest)
            self.status.chunks = sum(entry.get("chunks", 0) for entry in self._manifest.values())
        return count

    # ---------- busca ----------

    def is_empty(self) -> bool:
        return self._collection.count() == 0

    def search(self, query: str, top_k: int = 6) -> list[Source]:
        if self.is_empty():
            return []
        result = self._collection.query(
            query_texts=[query],
            n_results=min(top_k, self._collection.count()),
            include=["documents", "metadatas", "distances"],
        )
        documents = result.get("documents") or [[]]
        metadatas = result.get("metadatas") or [[]]
        distances = result.get("distances") or [[]]
        sources: list[Source] = []
        for ref, (doc, meta, dist) in enumerate(
            zip(documents[0], metadatas[0], distances[0]), start=1
        ):
            sources.append(
                Source(
                    ref=ref,
                    file=str(meta.get("file", "")),
                    snippet=doc,
                    score=round(1.0 - float(dist), 4),
                    page=meta.get("page"),
                )
            )
        return sources


_indexer: Optional[Indexer] = None
_indexer_lock = threading.Lock()


def get_indexer() -> Indexer:
    global _indexer
    with _indexer_lock:
        if _indexer is None:
            _indexer = Indexer()
        return _indexer
