"""Monta o contexto a partir do indice e pede a resposta ao provedor de IA, com citacao de fontes."""

import re

from ..schemas import ChatMessage, ChatResponse, Language, Settings, Source
from .indexer import Indexer
from .llm import build_provider

LANGUAGE_NAMES: dict[str, str] = {
    "pt-BR": "portugues do Brasil",
    "en": "ingles",
}

SYSTEM_PROMPT = """Voce e o Support Helper, um assistente de suporte tecnico.
Responda SEMPRE em {language}, independentemente do idioma dos documentos ou da pergunta.

Regras:
1. Use APENAS as informacoes dos trechos da base de conhecimento fornecidos abaixo.
2. Sempre que usar uma informacao, cite a fonte com o numero entre colchetes, por exemplo [1] ou [2][3].
3. Se os trechos nao contiverem a resposta, diga claramente que a base de conhecimento nao cobre essa pergunta e sugira o que o operador pode verificar. Nao invente procedimentos.
4. Quando a resposta for um procedimento, apresente em passos numerados, curtos e objetivos.

Trechos da base de conhecimento:
{context}
"""

NO_CONTEXT_PROMPT = """Voce e o Support Helper, um assistente de suporte tecnico. Responda SEMPRE em {language}.
A base de conhecimento ainda nao possui documentos indexados, portanto informe ao operador que ele precisa
configurar a pasta da base de conhecimento e clicar em Reindexar nas Configuracoes antes de obter respostas baseadas nos manuais."""

MAX_HISTORY = 8


def _format_context(sources: list[Source]) -> str:
    parts = []
    for source in sources:
        location = source.file
        if source.page is not None:
            location += f", pagina {source.page}"
        parts.append(f"[{source.ref}] ({location})\n{source.snippet}")
    return "\n\n".join(parts)


def _with_instructions(prompt: str, instructions: str) -> str:
    text = instructions.strip()
    if not text:
        return prompt
    return (
        prompt
        + "\n\nInstrucoes do operador sobre como responder "
        + "(aplique em toda resposta; nao invente procedimentos fora da base):\n"
        + text
    )


def _referenced_sources(answer: str, sources: list[Source]) -> list[Source]:
    cited = {int(n) for n in re.findall(r"\[(\d+)\]", answer)}
    referenced = [s for s in sources if s.ref in cited]
    return referenced if referenced else sources


def answer_question(
    settings: Settings,
    indexer: Indexer,
    message: str,
    history: list[ChatMessage],
    language: Language = "pt-BR",
) -> ChatResponse:
    provider = build_provider(settings)
    sources = indexer.search(message)
    language_name = LANGUAGE_NAMES.get(language, LANGUAGE_NAMES["pt-BR"])
    if sources:
        system = SYSTEM_PROMPT.format(language=language_name, context=_format_context(sources))
    else:
        system = NO_CONTEXT_PROMPT.format(language=language_name)
    system = _with_instructions(system, settings.ai_instructions)

    messages = [{"role": m.role, "content": m.content} for m in history[-MAX_HISTORY:]]
    messages.append({"role": "user", "content": message})

    answer = provider.chat(system, messages)
    return ChatResponse(answer=answer, sources=_referenced_sources(answer, sources))
