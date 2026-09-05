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

function initialPreference(): LanguagePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return validPreference(stored) ? stored : "system";
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [languagePreference, setPreference] = useState<LanguagePreference>(initialPreference);
  const [browserLocales, setBrowserLocales] = useState<readonly string[]>(["en"]);

  useEffect(
    () =>
      setBrowserLocales(navigator.languages?.length ? navigator.languages : [navigator.language]),
    [],
  );
  const resolvedLocale = resolveLocale(languagePreference, browserLocales);
  useEffect(() => {
    document.documentElement.lang = resolvedLocale;
  }, [resolvedLocale]);

  const setLanguagePreference = useCallback((value: LanguagePreference) => {
    setPreference(value);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
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
