import { useState } from "react";
import { useI18n } from "../i18n";
import type { Source } from "../types";

export default function SourceList({ sources }: { sources: Source[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  if (!sources.length) return null;
  return (
    <div className="sources">
      <div className="sources-title">{t("sources.title")}</div>
      <ul className="sources-list">
        {sources.map((source) => {
          const expanded = open === source.ref;
          return (
            <li key={source.ref} className="source-item">
              <button
                type="button"
                className="source-header"
                onClick={() => setOpen(expanded ? null : source.ref)}
                aria-expanded={expanded}
              >
                <span className="source-ref">[{source.ref}]</span>
                <span className="source-file">
                  {source.file}
                  {source.page ? ` (${t("sources.page", { page: source.page })})` : ""}
                </span>
                <span className="source-score" title={t("sources.similarity")}>
                  {Math.round(source.score * 100)}%
                </span>
              </button>
              {expanded && <pre className="source-snippet">{source.snippet}</pre>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
