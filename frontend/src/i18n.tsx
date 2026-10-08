import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type Language = "pt-BR" | "en";

const STORAGE_KEY = "support-helper.language";

const messages = {
  "pt-BR": {
    // geral
    "nav.chat": "Chat",
    "nav.settings": "Configurações",
    "lang.label": "Idioma",
    "api.offline": "Não foi possível conectar ao backend. Verifique se ele está em execução (start.ps1).",

    // chat
    "chat.title": "Chat",
    "chat.welcome": "Bem-vindo ao Support Helper",
    "chat.welcomeHint": "Pergunte sobre os manuais e atendimentos da sua base de conhecimento.",
    "chat.newConversation": "Nova conversa",
    "chat.saveToKb": "Salvar chat na base de conhecimento",
    "chat.saving": "Salvando...",
    "chat.saved": "Chat salvo na base de conhecimento: {path}",
    "chat.saveFailed": "Falha ao salvar o chat.",
    "chat.unexpectedError": "Erro inesperado ao consultar a IA.",
    "chat.configIncomplete": "Configuração incompleta: informe o token de IA e a pasta da base de conhecimento em",
    "chat.you": "Você",
    "chat.assistant": "Support Helper",
    "chat.thinking": "Consultando a base de conhecimento...",
    "chat.placeholder": "Como posso ajudar hoje?",
    "chat.send": "Enviar",
    "sources.title": "Fontes",
    "sources.page": "página {page}",
    "sources.similarity": "Similaridade",

    // configuracoes
    "settings.title": "Configurações",
    "settings.ai": "Inteligência artificial",
    "settings.provider": "Provedor",
    "settings.model": "Modelo",
    "settings.model.custom": "Outro (digitar o nome do modelo)",
    "settings.model.customPlaceholder": "ex.: gpt-4o-2024-11-20",
    "settings.model.customHint": "Use o identificador exato do modelo conforme a documentação do provedor.",
    "settings.model.hint.fast": "rápido e econômico",
    "settings.model.hint.balanced": "equilibrado",
    "settings.model.hint.advanced": "mais capaz, mais caro",
    "settings.model.hint.reasoning": "raciocínio",
    "settings.apiKey": "Token de API",
    "settings.apiKeySaved": "Salvo ({masked}). Digite para substituir.",
    "settings.apiKeyPlaceholder": "Cole o token aqui",
    "settings.apiKeyPlaceholder.cursor": "Cole a chave cursor_... aqui",
    "settings.apiKeyHint": "O token fica salvo apenas no seu computador e é usado somente para responder às perguntas.",
    "settings.apiKeyHint.cursor":
      "Gere a chave em cursor.com/dashboard → Integrations (User API Keys). As respostas são processadas pelo agente do Cursor sem acesso a arquivos ou terminal; a primeira resposta pode demorar alguns segundos a mais.",
    "settings.show": "Mostrar",
    "settings.hide": "Ocultar",
    "settings.instructions": "Instruções da IA",
    "settings.instructionsHint":
      "Descreva como a IA deve responder. Este texto é enviado junto com cada pergunta.",
    "settings.instructionsPlaceholder":
      "Ex.: Responda de forma direta, em passos curtos, e comece pelo que o operador deve fazer agora.",
    "settings.kb": "Base de conhecimento",
    "settings.kbPath": "Pasta local com os documentos",
    "settings.kbPathPlaceholder": "C:\\Users\\voce\\Documentos\\base-suporte",
    "settings.kbNotFound": "Pasta não encontrada. Verifique o caminho.",
    "settings.kbFormats":
      "Formatos aceitos: .txt, .md, .docx, .odt, .pdf (subpastas incluídas). Arquivos .doc devem ser salvos como .docx. Imagens são ignoradas.",
    "settings.save": "Salvar",
    "settings.savingBtn": "Salvando...",
    "settings.saved": "Configurações salvas.",
    "settings.saveFailed": "Falha ao salvar.",
    "settings.index": "Índice",
    "settings.reindex": "Reindexar",
    "settings.indexing": "Indexando...",
    "settings.reindexFailed": "Falha ao iniciar a reindexação.",
    "settings.saveBeforeReindex": "Salve as configurações antes de reindexar",
    "settings.state": "Estado",
    "settings.state.idle": "Ocioso",
    "settings.state.indexing": "Indexando",
    "settings.state.error": "Erro",
    "settings.documents": "Documentos",
    "settings.chunks": "Trechos",
    "settings.lastIndexed": "Última indexação",
    "settings.never": "nunca",
    "settings.ignored": "Ignorados (formato)",
    "settings.empty": "Sem texto extraível",
    "settings.files": "{count} arquivo(s)",
    "settings.statusUnavailable": "Não foi possível obter o status do índice.",
  },
  en: {
    "nav.chat": "Chat",
    "nav.settings": "Settings",
    "lang.label": "Language",
    "api.offline": "Could not connect to the backend. Make sure it is running (start.ps1).",

    "chat.title": "Chat",
    "chat.welcome": "Welcome to Support Helper",
    "chat.welcomeHint": "Ask about the manuals and past tickets in your knowledge base.",
    "chat.newConversation": "New conversation",
    "chat.saveToKb": "Save chat to knowledge base",
    "chat.saving": "Saving...",
    "chat.saved": "Chat saved to knowledge base: {path}",
    "chat.saveFailed": "Failed to save the chat.",
    "chat.unexpectedError": "Unexpected error while querying the AI.",
    "chat.configIncomplete": "Setup incomplete: provide the AI token and the knowledge base folder in",
    "chat.you": "You",
    "chat.assistant": "Support Helper",
    "chat.thinking": "Searching the knowledge base...",
    "chat.placeholder": "How can I help you today?",
    "chat.send": "Send",
    "sources.title": "Sources",
    "sources.page": "page {page}",
    "sources.similarity": "Similarity",

    "settings.title": "Settings",
    "settings.ai": "Artificial intelligence",
    "settings.provider": "Provider",
    "settings.model": "Model",
    "settings.model.custom": "Other (type the model name)",
    "settings.model.customPlaceholder": "e.g. gpt-4o-2024-11-20",
    "settings.model.customHint": "Use the exact model identifier from the provider's documentation.",
    "settings.model.hint.fast": "fast and affordable",
    "settings.model.hint.balanced": "balanced",
    "settings.model.hint.advanced": "most capable, pricier",
    "settings.model.hint.reasoning": "reasoning",
    "settings.apiKey": "API token",
    "settings.apiKeySaved": "Saved ({masked}). Type to replace.",
    "settings.apiKeyPlaceholder": "Paste the token here",
    "settings.apiKeyPlaceholder.cursor": "Paste the cursor_... key here",
    "settings.apiKeyHint": "The token is stored only on your computer and is used solely to answer your questions.",
    "settings.apiKeyHint.cursor":
      "Create the key at cursor.com/dashboard → Integrations (User API Keys). Answers are processed by the Cursor agent with no file or terminal access; the first answer may take a few extra seconds.",
    "settings.show": "Show",
    "settings.hide": "Hide",
    "settings.instructions": "AI instructions",
    "settings.instructionsHint":
      "Describe how the AI should answer. This text is sent with every question.",
    "settings.instructionsPlaceholder":
      "E.g. Answer directly, in short steps, and start with what the operator should do now.",
    "settings.kb": "Knowledge base",
    "settings.kbPath": "Local folder with the documents",
    "settings.kbPathPlaceholder": "C:\\Users\\you\\Documents\\support-kb",
    "settings.kbNotFound": "Folder not found. Check the path.",
    "settings.kbFormats":
      "Accepted formats: .txt, .md, .docx, .odt, .pdf (subfolders included). .doc files must be saved as .docx. Images are ignored.",
    "settings.save": "Save",
    "settings.savingBtn": "Saving...",
    "settings.saved": "Settings saved.",
    "settings.saveFailed": "Failed to save.",
    "settings.index": "Index",
    "settings.reindex": "Reindex",
    "settings.indexing": "Indexing...",
    "settings.reindexFailed": "Failed to start reindexing.",
    "settings.saveBeforeReindex": "Save the settings before reindexing",
    "settings.state": "State",
    "settings.state.idle": "Idle",
    "settings.state.indexing": "Indexing",
    "settings.state.error": "Error",
    "settings.documents": "Documents",
    "settings.chunks": "Chunks",
    "settings.lastIndexed": "Last indexed",
    "settings.never": "never",
    "settings.ignored": "Ignored (format)",
    "settings.empty": "No extractable text",
    "settings.files": "{count} file(s)",
    "settings.statusUnavailable": "Could not fetch the index status.",
  },
} as const;

export type MessageKey = keyof (typeof messages)["pt-BR"];

type Vars = Record<string, string | number>;

interface I18nValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: MessageKey, vars?: Vars) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function loadLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "pt-BR") return stored;
  return navigator.language.toLowerCase().startsWith("pt") ? "pt-BR" : "en";
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(loadLanguage);

  const setLanguage = useCallback((next: Language) => {
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
    setLanguageState(next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      language,
      setLanguage,
      t: (key, vars) => interpolate(messages[language][key], vars),
    }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
