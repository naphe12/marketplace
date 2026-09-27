import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  defaultLanguage,
  languages,
  translations,
  type LanguageCode,
  type TranslationKey,
} from "./translations";

type I18nContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: TranslationKey) => string;
};

const storageKey = "marketbi-language";

const I18nContext = createContext<I18nContextValue | null>(null);

function normalizeLanguageCode(value: string | null): string | null {
  if (value === "rn") {
    return "ki";
  }

  return value;
}

function isLanguageCode(value: string | null): value is LanguageCode {
  return languages.some(language => language.code === value);
}

function initialLanguage(): LanguageCode {
  if (typeof window === "undefined") {
    return defaultLanguage;
  }

  const saved = normalizeLanguageCode(
    window.localStorage.getItem(storageKey),
  );

  if (isLanguageCode(saved)) {
    return saved;
  }

  const browserLanguage = normalizeLanguageCode(
    window.navigator.language.slice(0, 2),
  );

  if (isLanguageCode(browserLanguage)) {
    return browserLanguage;
  }

  return defaultLanguage;
}

type Props = {
  children: ReactNode;
};

export function I18nProvider({ children }: Props) {
  const [language, setLanguageState] =
    useState<LanguageCode>(initialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(storageKey, language);
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      t: key => translations[language][key] ?? translations[defaultLanguage][key],
    }),
    [language],
  );

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return context;
}
