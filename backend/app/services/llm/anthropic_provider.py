from .base import LLMError, LLMProvider


class AnthropicProvider(LLMProvider):
    def chat(self, system: str, messages: list[dict[str, str]]) -> str:
        from anthropic import Anthropic, APIStatusError, AuthenticationError

        client = Anthropic(api_key=self.api_key)
        try:
            response = client.messages.create(
                model=self.model,
                system=system,
                messages=messages,
                max_tokens=2048,
            )
        except AuthenticationError as exc:
            raise LLMError("Token da Anthropic invalido ou sem permissao.") from exc
        except APIStatusError as exc:
            raise LLMError(f"Erro da Anthropic ({exc.status_code}): {exc.message}") from exc
        parts = [block.text for block in response.content if getattr(block, "type", "") == "text"]
        return "".join(parts).strip()
