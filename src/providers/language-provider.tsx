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
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    // Storage may be unavailable in hardened/private browser contexts.
  }
  return validPreference(stored) ? stored : "system";
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [languagePreference, setPreference] = useState<LanguagePreference>(initialPreference);
  const [browserLocales, setBrowserLocales] = useState<readonly string[]>(() =>
    typeof navigator === "undefined"
      ? ["en"]
      : navigator.languages?.length
        ? navigator.languages
        : [navigator.language],
  );

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
