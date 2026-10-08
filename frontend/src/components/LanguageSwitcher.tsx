import { useI18n, type Language } from "../i18n";

const OPTIONS: { value: Language; label: string }[] = [
  { value: "pt-BR", label: "PT-BR" },
  { value: "en", label: "EN" },
];

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  return (
    <div className="lang-switcher" role="group" aria-label={t("lang.label")}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`lang-option${language === option.value ? " active" : ""}`}
          onClick={() => setLanguage(option.value)}
          aria-pressed={language === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
