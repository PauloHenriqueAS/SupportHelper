import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useI18n } from "../i18n";

interface Props {
  disabled: boolean;
  onSend: (text: string) => void;
}

export default function MessageInput({ disabled, onSend }: Props) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const max = Math.min(window.innerHeight * 0.42, 320);
    input.style.height = "auto";
    const full = input.scrollHeight;
    input.style.height = `${Math.min(full, max)}px`;
    input.style.overflowY = full > max + 1 ? "auto" : "hidden";
  }, [text]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        ref={inputRef}
        className="composer-input"
        placeholder={t("chat.placeholder")}
        value={text}
        rows={1}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
      />
      <button type="submit" className="btn primary" disabled={disabled || !text.trim()}>
        {t("chat.send")}
      </button>
    </form>
  );
}
