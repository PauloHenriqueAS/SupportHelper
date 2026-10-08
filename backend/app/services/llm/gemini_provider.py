from .base import LLMError, LLMProvider


class GeminiProvider(LLMProvider):
    def chat(self, system: str, messages: list[dict[str, str]]) -> str:
        from google import genai
        from google.genai import errors, types

        client = genai.Client(api_key=self.api_key)
        contents = [
            types.Content(
                role="user" if message["role"] == "user" else "model",
                parts=[types.Part.from_text(text=message["content"])],
            )
            for message in messages
        ]
        try:
            response = client.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=0.2,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                ),
            )
        except errors.ClientError as exc:
            if exc.code in (401, 403) or "api key" in str(exc.message).lower():
                raise LLMError("Token do Gemini invalido ou sem permissao.") from exc
            raise LLMError(f"Erro do Gemini ({exc.code}): {exc.message}") from exc
        except errors.APIError as exc:
            raise LLMError(f"Erro do Gemini: {exc.message}") from exc
        return (response.text or "").strip()
