from typing import Literal, Optional

from pydantic import BaseModel, Field

Provider = Literal["openai", "anthropic", "gemini", "cursor"]

DEFAULT_MODELS: dict[str, str] = {
    "openai": "gpt-4o-mini",
    "anthropic": "claude-3-5-haiku-latest",
    "gemini": "gemini-2.0-flash",
    "cursor": "composer-2.5",
}


class Settings(BaseModel):
    provider: Provider = "openai"
    model: str = DEFAULT_MODELS["openai"]
    api_key: str = ""
    knowledge_path: str = ""
    ai_instructions: str = ""


class SettingsUpdate(BaseModel):
    provider: Provider
    model: str
    # Se vier vazio ou mascarado, o backend mantem o token anterior.
    api_key: Optional[str] = None
    knowledge_path: str
    ai_instructions: str = ""


class SettingsResponse(BaseModel):
    provider: Provider
    model: str
    api_key_masked: str
    has_api_key: bool
    knowledge_path: str
    knowledge_path_exists: bool
    ai_instructions: str = ""


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


Language = Literal["pt-BR", "en"]


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    history: list[ChatMessage] = []
    language: Language = "pt-BR"


class Source(BaseModel):
    ref: int
    file: str
    snippet: str
    score: float
    page: Optional[int] = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]


class IndexStatus(BaseModel):
    state: Literal["idle", "indexing", "error"] = "idle"
    message: str = ""
    documents: int = 0
    chunks: int = 0
    last_indexed_at: Optional[str] = None
    ignored_files: list[str] = []
    empty_files: list[str] = []


class SaveChatRequest(BaseModel):
    messages: list[ChatMessage]


class SaveChatResponse(BaseModel):
    path: str
    chunks: int
