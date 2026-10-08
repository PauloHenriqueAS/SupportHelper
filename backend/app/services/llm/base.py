from abc import ABC, abstractmethod


class LLMError(Exception):
    """Erro amigavel para exibir ao operador (token invalido, modelo inexistente etc.)."""


class LLMProvider(ABC):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    @abstractmethod
    def chat(self, system: str, messages: list[dict[str, str]]) -> str:
        """messages: lista de {"role": "user"|"assistant", "content": str}."""
