import re
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException

from ..config import load_settings
from ..schemas import IndexStatus, SaveChatRequest, SaveChatResponse
from ..services.indexer import get_indexer
from ..services.sources.local_folder import LocalFolderSource

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

CHATS_SUBFOLDER = "atendimentos"


def _source() -> LocalFolderSource:
    settings = load_settings()
    if not settings.knowledge_path.strip():
        raise HTTPException(status_code=400, detail="Pasta da base de conhecimento nao configurada.")
    source = LocalFolderSource(settings.knowledge_path)
    if not source.root().is_dir():
        raise HTTPException(status_code=400, detail=f"Pasta nao encontrada: {source.root()}")
    return source


@router.get("/status", response_model=IndexStatus)
def status() -> IndexStatus:
    return get_indexer().status


@router.post("/reindex", response_model=IndexStatus, status_code=202)
def reindex(background: BackgroundTasks) -> IndexStatus:
    source = _source()
    indexer = get_indexer()
    if indexer.status.state == "indexing":
        return indexer.status
    indexer.status = IndexStatus(state="indexing", message="Iniciando...")
    background.add_task(indexer.reindex, source)
    return indexer.status


def _slugify(text: str, max_len: int = 40) -> str:
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE).strip().lower()
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:max_len].strip("-") or "chat"


@router.post("/save-chat", response_model=SaveChatResponse)
def save_chat(request: SaveChatRequest) -> SaveChatResponse:
    if not request.messages:
        raise HTTPException(status_code=400, detail="Nao ha mensagens para salvar.")
    source = _source()
    settings = load_settings()

    folder = source.root() / CHATS_SUBFOLDER
    folder.mkdir(parents=True, exist_ok=True)

    first_question = next((m.content for m in request.messages if m.role == "user"), "chat")
    now = datetime.now()
    filename = f"{now.strftime('%Y-%m-%d_%H%M')}_{_slugify(first_question)}.md"
    path: Path = folder / filename
    counter = 1
    while path.exists():
        counter += 1
        path = folder / f"{now.strftime('%Y-%m-%d_%H%M')}_{_slugify(first_question)}-{counter}.md"

    lines = [
        f"# Atendimento: {first_question.strip()[:80]}",
        "",
        f"- Data: {now.strftime('%d/%m/%Y %H:%M')}",
        f"- Provedor de IA: {settings.provider} ({settings.model})",
        "",
    ]
    for message in request.messages:
        label = "Operador" if message.role == "user" else "Support Helper"
        lines.append(f"## {label}")
        lines.append("")
        lines.append(message.content.strip())
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")

    chunks = get_indexer().index_single_file(source, path)
    return SaveChatResponse(path=str(path), chunks=chunks)
