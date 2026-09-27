import {
  Languages,
} from "lucide-react";

import {
  useI18n,
} from "./I18nProvider";

import {
  languages,
  type LanguageCode,
} from "./translations";

export default function LanguageSwitcher() {
  const {
    language,
    setLanguage,
    t,
  } = useI18n();

  return (
    <label className="language-switcher">
      <Languages size={17} aria-hidden="true" />

      <span className="sr-only">
        {t("language.label")}
      </span>

      <select
        value={language}
        aria-label={t("language.label")}
        onChange={event =>
          setLanguage(
            event.target.value as LanguageCode,
          )
        }
      >
        {languages.map(item => (
          <option key={item.code} value={item.code}>
            {item.shortLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
