from pathlib import Path

from ..parsers import is_supported
from .base import KnowledgeSource, SourceFile, SourceListing

_SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv"}


class LocalFolderSource(KnowledgeSource):
    def __init__(self, folder: str):
        self._root = Path(folder).expanduser().resolve()

    def root(self) -> Path:
        return self._root

    def list_files(self) -> SourceListing:
        if not self._root.is_dir():
            raise FileNotFoundError(f"Pasta da base de conhecimento nao encontrada: {self._root}")
        files: list[SourceFile] = []
        ignored: list[str] = []
        for path in sorted(self._root.rglob("*")):
            if not path.is_file():
                continue
            if any(part in _SKIP_DIRS or part.startswith("~$") for part in path.parts):
                continue
            relative = path.relative_to(self._root).as_posix()
            if is_supported(path):
                files.append(SourceFile(path=path, relative=relative))
            else:
                ignored.append(relative)
        return SourceListing(files=files, ignored=ignored)
