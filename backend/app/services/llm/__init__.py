from ...schemas import Settings
from .base import LLMError, LLMProvider


def build_provider(settings: Settings) -> LLMProvider:
    if not settings.api_key:
        raise LLMError("Nenhum token de API configurado. Acesse Configuracoes e informe o token.")
    if settings.provider == "openai":
        from .openai_provider import OpenAIProvider

        return OpenAIProvider(settings.api_key, settings.model)
    if settings.provider == "anthropic":
        from .anthropic_provider import AnthropicProvider

        return AnthropicProvider(settings.api_key, settings.model)
    if settings.provider == "gemini":
        from .gemini_provider import GeminiProvider

        return GeminiProvider(settings.api_key, settings.model)
    if settings.provider == "cursor":
        from .cursor_provider import CursorProvider

        return CursorProvider(settings.api_key, settings.model)
    raise LLMError(f"Provedor desconhecido: {settings.provider}")


__all__ = ["LLMError", "LLMProvider", "build_provider"]
