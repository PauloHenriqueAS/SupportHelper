export type Provider = "openai" | "anthropic" | "gemini" | "cursor";

export const PROVIDER_LABELS: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  gemini: "Google Gemini",
  cursor: "Cursor",
};

export type ModelHint = "fast" | "balanced" | "advanced" | "reasoning";

export interface ModelOption {
  value: string;
  label: string;
  hint?: ModelHint;
}

export const MODEL_OPTIONS: Record<Provider, ModelOption[]> = {
  openai: [
    { value: "gpt-4o-mini", label: "GPT-4o mini", hint: "fast" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 mini", hint: "fast" },
    { value: "gpt-4o", label: "GPT-4o", hint: "balanced" },
    { value: "gpt-4.1", label: "GPT-4.1", hint: "advanced" },
    { value: "o4-mini", label: "o4-mini", hint: "reasoning" },
  ],
  anthropic: [
    { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", hint: "fast" },
    { value: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet", hint: "balanced" },
    { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", hint: "balanced" },
    { value: "claude-opus-4-1", label: "Claude Opus 4.1", hint: "advanced" },
  ],
  gemini: [
    { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", hint: "fast" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", hint: "fast" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", hint: "balanced" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "advanced" },
  ],
  cursor: [
    { value: "composer-2.5", label: "Composer 2.5", hint: "fast" },
    { value: "composer-2", label: "Composer 2", hint: "balanced" },
    { value: "auto", label: "Auto", hint: "balanced" },
  ],
};

export const DEFAULT_MODELS: Record<Provider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
  gemini: "gemini-2.0-flash",
  cursor: "composer-2.5",
};

/** Valor especial do dropdown que libera um campo para digitar um modelo fora da lista. */
export const CUSTOM_MODEL = "__custom__";

export interface SettingsResponse {
  provider: Provider;
  model: string;
  api_key_masked: string;
  has_api_key: boolean;
  knowledge_path: string;
  knowledge_path_exists: boolean;
  ai_instructions: string;
}

export interface SettingsUpdate {
  provider: Provider;
  model: string;
  api_key?: string;
  knowledge_path: string;
  ai_instructions: string;
}

export interface Source {
  ref: number;
  file: string;
  snippet: string;
  score: number;
  page?: number | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  error?: boolean;
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
}

export interface IndexStatus {
  state: "idle" | "indexing" | "error";
  message: string;
  documents: number;
  chunks: number;
  last_indexed_at: string | null;
  ignored_files: string[];
  empty_files: string[];
}

export interface SaveChatResponse {
  path: string;
  chunks: number;
}
