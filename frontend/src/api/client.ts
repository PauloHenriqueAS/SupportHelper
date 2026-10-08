import type {
  ChatMessage,
  ChatResponse,
  IndexStatus,
  SaveChatResponse,
  SettingsResponse,
  SettingsUpdate,
} from "../types";

export const API_BASE = "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  /** true quando o backend nem respondeu (offline); a UI traduz a mensagem. */
  offline: boolean;
  constructor(status: number, message: string, offline = false) {
    super(message);
    this.status = status;
    this.offline = offline;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError(0, "Backend offline", true);
  }
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail.map((d: { msg: string }) => d.msg).join("; ");
    } catch {
      // corpo nao e JSON
    }
    throw new ApiError(response.status, detail);
  }
  return (await response.json()) as T;
}

export const api = {
  getSettings: () => request<SettingsResponse>("/api/settings"),
  updateSettings: (update: SettingsUpdate) =>
    request<SettingsResponse>("/api/settings", { method: "PUT", body: JSON.stringify(update) }),

  chat: (message: string, history: ChatMessage[], language: string) =>
    request<ChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        language,
        history: history.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content })),
      }),
    }),

  getIndexStatus: () => request<IndexStatus>("/api/knowledge/status"),
  reindex: () => request<IndexStatus>("/api/knowledge/reindex", { method: "POST" }),
  saveChat: (messages: ChatMessage[]) =>
    request<SaveChatResponse>("/api/knowledge/save-chat", {
      method: "POST",
      body: JSON.stringify({
        messages: messages.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content })),
      }),
    }),
};
