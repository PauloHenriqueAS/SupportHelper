import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import LanguageSwitcher from "../components/LanguageSwitcher";
import Logo from "../components/Logo";
import MessageInput from "../components/MessageInput";
import MessageList from "../components/MessageList";
import { useI18n } from "../i18n";
import type { ChatMessage, SettingsResponse } from "../types";

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function ChatPage() {
  const { t, language } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const errorText = (error: unknown, fallback: string) => {
    if (error instanceof ApiError) return error.offline ? t("api.offline") : error.message;
    return fallback;
  };

  const configIncomplete = settings && (!settings.has_api_key || !settings.knowledge_path_exists);

  const send = async (text: string) => {
    const userMessage: ChatMessage = { id: newId(), role: "user", content: text };
    const history = messages;
    setMessages((current) => [...current, userMessage]);
    setLoading(true);
    try {
      const response = await api.chat(text, history, language);
      setMessages((current) => [
        ...current,
        { id: newId(), role: "assistant", content: response.answer, sources: response.sources },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: newId(), role: "assistant", content: errorText(error, t("chat.unexpectedError")), error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const saveChat = async () => {
    setSaving(true);
    try {
      const result = await api.saveChat(messages);
      setToast(t("chat.saved", { path: result.path }));
    } catch (error) {
      setToast(errorText(error, t("chat.saveFailed")));
    } finally {
      setSaving(false);
    }
  };

  const hasAnswer = messages.some((m) => m.role === "assistant" && !m.error);

  return (
    <div className="page chat-page">
      <header className="page-header">
        <h1 className="page-title">{t("chat.title")}</h1>
        <div className="header-actions">
          {messages.length > 0 && (
            <button type="button" className="btn" onClick={() => setMessages([])} disabled={loading}>
              {t("chat.newConversation")}
            </button>
          )}
          <button type="button" className="btn" onClick={saveChat} disabled={!hasAnswer || saving || loading}>
            {saving ? t("chat.saving") : t("chat.saveToKb")}
          </button>
          <LanguageSwitcher />
        </div>
      </header>

      {configIncomplete && (
        <div className="banner warning">
          {t("chat.configIncomplete")} <Link to="/settings">{t("nav.settings")}</Link>.
        </div>
      )}

      {messages.length === 0 && !loading ? (
        <div className="welcome">
          <Logo size={72} />
          <h2>{t("chat.welcome")}</h2>
          <p>{t("chat.welcomeHint")}</p>
        </div>
      ) : (
        <MessageList messages={messages} loading={loading} />
      )}

      <MessageInput disabled={loading} onSend={send} />

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
