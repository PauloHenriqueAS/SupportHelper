from .base import LLMError, LLMProvider


class OpenAIProvider(LLMProvider):
    def chat(self, system: str, messages: list[dict[str, str]]) -> str:
        from openai import APIStatusError, AuthenticationError, OpenAI

        client = OpenAI(api_key=self.api_key)
        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[{"role": "system", "content": system}, *messages],
                temperature=0.2,
            )
        except AuthenticationError as exc:
            raise LLMError("Token da OpenAI invalido ou sem permissao.") from exc
        except APIStatusError as exc:
            raise LLMError(f"Erro da OpenAI ({exc.status_code}): {exc.message}") from exc
        return (response.choices[0].message.content or "").strip()
