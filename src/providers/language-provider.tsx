import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  LANGUAGE_STORAGE_KEY,
  resolveLocale,
  translate,
  type LanguagePreference,
  type ResolvedLocale,
  type TranslationKey,
} from "@/i18n";

type LanguageContextValue = {
  languagePreference: LanguagePreference;
  resolvedLocale: ResolvedLocale;
  setLanguagePreference: (value: LanguagePreference) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const validPreference = (value: unknown): value is LanguagePreference =>
  value === "system" || value === "pt-BR" || value === "en";

export function LanguageProvider({ children }: PropsWithChildren) {
  // The first client render must exactly match SSR. Browser/localStorage-derived
  // language is applied only after hydration to avoid React text mismatch (#418).
  const [languagePreference, setPreference] = useState<LanguagePreference>("system");
  const [browserLocales, setBrowserLocales] = useState<readonly string[]>(["en"]);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch {
      // Storage may be unavailable in hardened/private browser contexts.
    }
    if (validPreference(stored)) setPreference(stored);
    setBrowserLocales(
      navigator.languages?.length ? navigator.languages : [navigator.language || "en"],
    );
  }, []);
  const resolvedLocale = resolveLocale(languagePreference, browserLocales);
  useEffect(() => {
    document.documentElement.lang = resolvedLocale;
  }, [resolvedLocale]);

  const setLanguagePreference = useCallback((value: LanguagePreference) => {
    setPreference(value);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
    } catch {
      // Keep the in-memory selection usable if persistence is unavailable.
    }
  }, []);

  const value = useMemo(
    () => ({
      languagePreference,
      resolvedLocale,
      setLanguagePreference,
      t: (key: TranslationKey, params?: Record<string, string | number>) =>
        translate(resolvedLocale, key, params),
    }),
    [languagePreference, resolvedLocale, setLanguagePreference],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used within LanguageProvider");
  return value;
}
