import { useEffect, useRef } from "react";
import { useI18n } from "../i18n";
import type { ChatMessage } from "../types";
import SourceList from "./SourceList";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
}

export default function MessageList({ messages, loading }: Props) {
  const { t } = useI18n();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  return (
    <div className="messages">
      {messages.map((message) => (
        <div key={message.id} className={`message ${message.role}${message.error ? " error" : ""}`}>
          <div className="message-role">{message.role === "user" ? t("chat.you") : t("chat.assistant")}</div>
          <div className="message-content">{message.content}</div>
          {message.sources && <SourceList sources={message.sources} />}
        </div>
      ))}
      {loading && (
        <div className="message assistant">
          <div className="message-role">{t("chat.assistant")}</div>
          <div className="message-content typing">{t("chat.thinking")}</div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
