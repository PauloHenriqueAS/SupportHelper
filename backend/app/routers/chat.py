from fastapi import APIRouter, HTTPException

from ..config import load_settings
from ..schemas import ChatRequest, ChatResponse
from ..services.indexer import get_indexer
from ..services.llm import LLMError
from ..services.rag import answer_question

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    settings = load_settings()
    try:
        return answer_question(settings, get_indexer(), request.message, request.history, request.language)
    except LLMError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # falha inesperada do SDK / rede
        raise HTTPException(status_code=500, detail=f"Falha ao consultar a IA: {exc}") from exc
