import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useI18n } from "../i18n";
import {
  CUSTOM_MODEL,
  DEFAULT_MODELS,
  MODEL_OPTIONS,
  PROVIDER_LABELS,
  type IndexStatus,
  type ModelHint,
  type Provider,
  type SettingsResponse,
} from "../types";

const PROVIDERS = Object.keys(PROVIDER_LABELS) as Provider[];

const isKnownModel = (provider: Provider, model: string) =>
  MODEL_OPTIONS[provider].some((option) => option.value === model);

export default function SettingsPage() {
  const { t, language } = useI18n();
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState(DEFAULT_MODELS.openai);
  // true quando o operador escolheu "Outro" e digita o nome do modelo manualmente
  const [customModel, setCustomModel] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [knowledgePath, setKnowledgePath] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [saved, setSaved] = useState<SettingsResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const [status, setStatus] = useState<IndexStatus | null>(null);
  const [reindexError, setReindexError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const errorText = (error: unknown, fallback: string) => {
    if (error instanceof ApiError) return error.offline ? t("api.offline") : error.message;
    return fallback;
  };

  const formatDate = (iso: string | null): string => {
    if (!iso) return t("settings.never");
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(language);
  };

  const applySettings = (data: SettingsResponse) => {
    setSaved(data);
    setProvider(data.provider);
    setModel(data.model);
    setCustomModel(!isKnownModel(data.provider, data.model));
    setKnowledgePath(data.knowledge_path);
    setAiInstructions(data.ai_instructions ?? "");
    setApiKey("");
  };

  const refreshStatus = useCallback(async () => {
    try {
      const data = await api.getIndexStatus();
      setStatus(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  const stopPolling = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = window.setInterval(async () => {
      const data = await refreshStatus();
      if (!data || data.state !== "indexing") stopPolling();
    }, 1500);
  }, [refreshStatus]);

  useEffect(() => {
    api
      .getSettings()
      .then(applySettings)
      .catch((error) => setFeedback({ kind: "error", text: errorText(error, String(error)) }));
    refreshStatus().then((data) => {
      if (data?.state === "indexing") startPolling();
    });
    return stopPolling;
  }, [refreshStatus, startPolling]);

  const onProviderChange = (next: Provider) => {
    setProvider(next);
    // modelos da lista pertencem a um provedor; ao trocar, volta para o padrao do novo provedor.
    // Se o operador digitou um modelo proprio, mantem o texto.
    if (!customModel) {
      setModel(DEFAULT_MODELS[next]);
    }
  };

  const onModelSelect = (value: string) => {
    if (value === CUSTOM_MODEL) {
      setCustomModel(true);
      setModel("");
      return;
    }
    setCustomModel(false);
    setModel(value);
  };

  const modelLabel = (label: string, hint?: ModelHint) =>
    hint ? `${label} — ${t(`settings.model.hint.${hint}`)}` : label;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const data = await api.updateSettings({
        provider,
        model: model.trim() || DEFAULT_MODELS[provider],
        api_key: apiKey.trim() || undefined,
        knowledge_path: knowledgePath.trim(),
        ai_instructions: aiInstructions.trim(),
      });
      applySettings(data);
      setFeedback({ kind: "ok", text: t("settings.saved") });
    } catch (error) {
      setFeedback({ kind: "error", text: errorText(error, t("settings.saveFailed")) });
    } finally {
      setSaving(false);
    }
  };

  const onReindex = async () => {
    setReindexError(null);
    try {
      const data = await api.reindex();
      setStatus(data);
      startPolling();
    } catch (error) {
      setReindexError(errorText(error, t("settings.reindexFailed")));
    }
  };

  const indexing = status?.state === "indexing";
  const pathDirty = saved !== null && knowledgePath.trim() !== saved.knowledge_path;

  const stateLabel = (state: IndexStatus["state"]) =>
    state === "idle" ? t("settings.state.idle") : state === "indexing" ? t("settings.state.indexing") : t("settings.state.error");

  return (
    <div className="page settings-page">
      <header className="page-header">
        <h1 className="page-title">{t("settings.title")}</h1>
        <div className="header-actions">
          <LanguageSwitcher />
        </div>
      </header>

      <form className="settings-form" onSubmit={onSubmit}>
        <section className="card">
          <h2>{t("settings.ai")}</h2>
          <label className="field">
            <span>{t("settings.provider")}</span>
            <select value={provider} onChange={(event) => onProviderChange(event.target.value as Provider)}>
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("settings.model")}</span>
            <select value={customModel ? CUSTOM_MODEL : model} onChange={(event) => onModelSelect(event.target.value)}>
              {MODEL_OPTIONS[provider].map((option) => (
                <option key={option.value} value={option.value}>
                  {modelLabel(option.label, option.hint)}
                </option>
              ))}
              <option value={CUSTOM_MODEL}>{t("settings.model.custom")}</option>
            </select>
          </label>
          {customModel && (
            <label className="field">
              <input
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder={t("settings.model.customPlaceholder")}
                autoFocus
              />
              <small>{t("settings.model.customHint")}</small>
            </label>
          )}
          <label className="field">
            <span>{t("settings.apiKey")}</span>
            <div className="input-with-button">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={
                  saved?.has_api_key
                    ? t("settings.apiKeySaved", { masked: saved.api_key_masked })
                    : provider === "cursor"
                      ? t("settings.apiKeyPlaceholder.cursor")
                      : t("settings.apiKeyPlaceholder")
                }
                autoComplete="off"
              />
              <button type="button" className="btn small" onClick={() => setShowKey((v) => !v)}>
                {showKey ? t("settings.hide") : t("settings.show")}
              </button>
            </div>
            <small>{t("settings.apiKeyHint")}</small>
            {provider === "cursor" && <small>{t("settings.apiKeyHint.cursor")}</small>}
          </label>
        </section>

        <section className="card">
          <h2>{t("settings.instructions")}</h2>
          <label className="field">
            <textarea
              className="instructions-input"
              value={aiInstructions}
              onChange={(event) => setAiInstructions(event.target.value)}
              placeholder={t("settings.instructionsPlaceholder")}
              rows={6}
            />
            <small>{t("settings.instructionsHint")}</small>
          </label>
        </section>

        <section className="card">
          <h2>{t("settings.kb")}</h2>
          <label className="field">
            <span>{t("settings.kbPath")}</span>
            <input
              value={knowledgePath}
              onChange={(event) => setKnowledgePath(event.target.value)}
              placeholder={t("settings.kbPathPlaceholder")}
            />
            {saved && saved.knowledge_path && !saved.knowledge_path_exists && !pathDirty && (
              <small className="text-error">{t("settings.kbNotFound")}</small>
            )}
            <small>{t("settings.kbFormats")}</small>
          </label>
        </section>

        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={saving || (customModel && !model.trim())}>
            {saving ? t("settings.savingBtn") : t("settings.save")}
          </button>
          {feedback && <span className={`feedback ${feedback.kind}`}>{feedback.text}</span>}
        </div>
      </form>

      <section className="card">
        <div className="card-header">
          <h2>{t("settings.index")}</h2>
          <button
            type="button"
            className="btn"
            onClick={onReindex}
            disabled={indexing || !saved?.knowledge_path_exists || pathDirty}
            title={pathDirty ? t("settings.saveBeforeReindex") : undefined}
          >
            {indexing ? t("settings.indexing") : t("settings.reindex")}
          </button>
        </div>
        {reindexError && <div className="feedback error">{reindexError}</div>}
        {status ? (
          <dl className="status-grid">
            <dt>{t("settings.state")}</dt>
            <dd>
              <span className={`badge ${status.state}`}>{stateLabel(status.state)}</span>
              {status.message && <span className="status-message"> {status.message}</span>}
            </dd>
            <dt>{t("settings.documents")}</dt>
            <dd>{status.documents}</dd>
            <dt>{t("settings.chunks")}</dt>
            <dd>{status.chunks}</dd>
            <dt>{t("settings.lastIndexed")}</dt>
            <dd>{formatDate(status.last_indexed_at)}</dd>
            {status.ignored_files.length > 0 && (
              <>
                <dt>{t("settings.ignored")}</dt>
                <dd>
                  <details>
                    <summary>{t("settings.files", { count: status.ignored_files.length })}</summary>
                    <ul className="file-list">
                      {status.ignored_files.map((file) => (
                        <li key={file}>{file}</li>
                      ))}
                    </ul>
                  </details>
                </dd>
              </>
            )}
            {status.empty_files.length > 0 && (
              <>
                <dt>{t("settings.empty")}</dt>
                <dd>
                  <details>
                    <summary>{t("settings.files", { count: status.empty_files.length })}</summary>
                    <ul className="file-list">
                      {status.empty_files.map((file) => (
                        <li key={file}>{file}</li>
                      ))}
                    </ul>
                  </details>
                </dd>
              </>
            )}
          </dl>
        ) : (
          <p className="muted">{t("settings.statusUnavailable")}</p>
        )}
      </section>
    </div>
  );
}
