import AsyncStorage from "@react-native-async-storage/async-storage";
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
  type TranslationKey,
} from "@/i18n";

type LanguageContextValue = {
  languagePreference: LanguagePreference;
  resolvedLocale: "pt-BR" | "en";
  ready: boolean;
  setLanguagePreference(value: LanguagePreference): Promise<void>;
  t(key: TranslationKey, params?: Record<string, string | number>): string;
};
const LanguageContext = createContext<LanguageContextValue | null>(null);
export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === "system" || value === "pt-BR" || value === "en";
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [languagePreference, setPreference] = useState<LanguagePreference>("system");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((value) => {
        if (isLanguagePreference(value)) setPreference(value);
      })
      .finally(() => setReady(true));
  }, []);
  const setLanguagePreference = useCallback(async (value: LanguagePreference) => {
    setPreference(value);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, value);
  }, []);
  const resolvedLocale = resolveLocale(languagePreference);
  const value = useMemo(
    () => ({
      languagePreference,
      resolvedLocale,
      ready,
      setLanguagePreference,
      t: (key: TranslationKey, params?: Record<string, string | number>) =>
        translate(resolvedLocale, key, params),
    }),
    [languagePreference, resolvedLocale, ready, setLanguagePreference],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used within LanguageProvider");
  return value;
}
