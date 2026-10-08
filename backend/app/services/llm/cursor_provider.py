"""Provedor que usa a API key do Cursor via cursor-sdk.

O SDK do Cursor e um SDK de agentes, nao uma API de chat pura. Para usa-lo como
"modelo de texto" criamos um agente local sem nenhuma ferramenta (tools=[]),
assim ele nao le nem altera arquivos: apenas responde com texto a partir do
prompt montado pelo RAG. O agente roda numa pasta de trabalho vazia dentro dos
dados do app para nao carregar contexto do computador do operador.
"""

import atexit
import queue
import subprocess
import sys
import threading
import time
from typing import Any, Mapping, Optional

from ...config import DATA_DIR
from .base import LLMError, LLMProvider

_ROLE_LABELS = {"user": "Operador", "assistant": "Assistente"}

_client_lock = threading.Lock()
_client: Optional[Any] = None


def _build_prompt(system: str, messages: list[dict[str, str]]) -> str:
    """O SDK nao tem campo de system prompt separado; tudo vai num unico prompt."""
    parts = [
        "## Instrucoes",
        system.strip(),
        "",
        "## Conversa",
    ]
    for message in messages:
        label = _ROLE_LABELS.get(message["role"], message["role"])
        parts.append(f"{label}: {message['content'].strip()}")
    parts.append("")
    parts.append("Responda a ultima mensagem do Operador seguindo as instrucoes acima.")
    return "\n".join(parts)


def _read_discovery_windows(process: subprocess.Popen, timeout: float) -> Mapping[str, Any]:
    """Versao compativel com Windows de cursor_sdk._bridge._read_discovery.

    A implementacao original usa selectors sobre o pipe de stderr do bridge, o que
    so funciona com sockets no Windows (WinError 10038). Aqui lemos o stderr em uma
    thread e esperamos a linha "cursor-sdk-bridge ready {...}".
    """
    from cursor_sdk._bridge import parse_discovery_line
    from cursor_sdk.errors import CursorSDKError

    if process.stderr is None:
        raise CursorSDKError("Bridge process stderr is unavailable")

    lines: "queue.Queue[Optional[str]]" = queue.Queue()

    def reader() -> None:
        try:
            for line in process.stderr:  # type: ignore[union-attr]
                lines.put(line)
        finally:
            lines.put(None)

    threading.Thread(target=reader, name="cursor-bridge-stderr", daemon=True).start()

    seen: list[str] = []
    deadline = time.monotonic() + timeout
    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise CursorSDKError("Timed out waiting for bridge discovery")
        try:
            line = lines.get(timeout=min(0.1, remaining))
        except queue.Empty:
            continue
        if line is None:
            raise CursorSDKError(
                f"Bridge exited before discovery with status {process.poll()}: " + "".join(seen)
            )
        seen.append(line)
        discovery = parse_discovery_line(line)
        if discovery is not None:
            return discovery


def _patch_sdk_for_windows() -> None:
    if sys.platform != "win32":
        return
    try:
        import cursor_sdk._bridge as bridge_module
    except ImportError:
        return
    if getattr(bridge_module, "_read_discovery", None) is not _read_discovery_windows and hasattr(
        bridge_module, "_read_discovery"
    ):
        bridge_module._read_discovery = _read_discovery_windows  # type: ignore[attr-defined]


def _get_client(workspace: str) -> Any:
    """Mantem um unico bridge do SDK vivo durante a vida do backend."""
    global _client
    with _client_lock:
        if _client is None:
            _patch_sdk_for_windows()
            from cursor_sdk import CursorClient

            _client = CursorClient.launch_bridge(workspace=workspace, allow_api_key_env_fallback=False)
            atexit.register(_close_client)
        return _client


def _close_client() -> None:
    """Encerra o bridge ao desligar o backend para nao deixar processo orfao."""
    global _client
    with _client_lock:
        if _client is not None:
            try:
                _client.close()
            except Exception:
                pass
            _client = None


def _assistant_text(message: Any) -> str:
    content = getattr(message, "message", None)
    blocks = getattr(content, "content", ()) if content else ()
    return "".join(getattr(block, "text", "") or "" for block in blocks)


def _failure_message(status: str, detail: str) -> str:
    detail = detail.strip()
    if "unable to open database file" in detail.lower():
        return (
            "O Cursor gerou a execucao, mas nao conseguiu gravar o resultado "
            "no banco local (unable to open database file)."
        )
    if detail:
        return f"A execucao no Cursor falhou: {detail}"
    return f"A execucao no Cursor terminou com status '{status}'."


def _push_text(chunks: list[str], text: str) -> None:
    """Aceita tanto pedacos incrementais quanto fotos acumuladas do mesmo texto."""
    if not text:
        return
    current = "".join(chunks)
    if text == current:
        return
    if current and text.startswith(current):
        chunks.clear()
        chunks.append(text)
        return
    chunks.append(text)


def _consume_run(run: Any) -> str:
    """Le o stream e devolve o texto do assistente.

    O bridge as vezes marca a run como error depois de ja ter enviado a
    resposta, ao falhar ao abrir o sqlite local. Nesse caso o texto util
    esta nos eventos assistant, nao em result.result.
    """
    chunks: list[str] = []
    error_detail = ""
    for event in run:
        message = event.sdk_message
        if message is None:
            continue
        kind = getattr(message, "type", "")
        if kind == "assistant":
            _push_text(chunks, _assistant_text(message))
        elif kind == "status" and str(getattr(message, "status", "")).upper() == "ERROR":
            error_detail = getattr(message, "message", "") or error_detail

    answer = (getattr(run, "result", "") or "").strip() or "".join(chunks).strip()
    status = getattr(run, "status", "")
    if answer and status in {"finished", "error"}:
        return answer
    if status != "finished":
        raise LLMError(_failure_message(status, error_detail))
    return answer


class CursorProvider(LLMProvider):
    def chat(self, system: str, messages: list[dict[str, str]]) -> str:
        from cursor_sdk import (
            Agent,
            AgentOptions,
            AuthenticationError,
            ConfigurationError,
            CursorAgentError,
            CursorSDKError,
            LocalAgentOptions,
            NetworkError,
            PermissionDeniedError,
            RateLimitError,
        )

        workspace = DATA_DIR / "cursor_workspace"
        workspace.mkdir(parents=True, exist_ok=True)

        prompt = _build_prompt(system, messages)
        options = AgentOptions(
            api_key=self.api_key,
            model=self.model,
            tools=[],  # apenas texto: sem leitura/edicao de arquivos, shell ou MCP
            local=LocalAgentOptions(cwd=str(workspace)),
        )

        def once(client: Any) -> str:
            agent = Agent.create(options, client=client)
            try:
                return _consume_run(agent.send(prompt))
            finally:
                agent.close()

        try:
            client = _get_client(str(workspace))
            try:
                return once(client)
            except CursorAgentError as exc:
                # Logo apos o bridge subir, a primeira chamada pode falhar com
                # "Network request failed"; uma unica nova tentativa resolve.
                transient = getattr(exc, "is_retryable", False) or "network" in str(exc).lower()
                if not transient:
                    raise
                time.sleep(1.0)
                return once(client)
        except AuthenticationError as exc:
            raise LLMError("API key do Cursor invalida ou sem permissao.") from exc
        except PermissionDeniedError as exc:
            raise LLMError("A API key do Cursor nao tem permissao para esta operacao.") from exc
        except RateLimitError as exc:
            raise LLMError("Limite de uso do Cursor atingido. Tente novamente em instantes.") from exc
        except NetworkError as exc:
            raise LLMError("Nao foi possivel conectar ao Cursor. Verifique a internet e tente novamente.") from exc
        except ConfigurationError as exc:
            raise LLMError(f"Configuracao invalida para o Cursor (modelo '{self.model}'?): {exc}") from exc
        except (CursorAgentError, CursorSDKError) as exc:
            raise LLMError(f"Erro do Cursor: {exc}") from exc
