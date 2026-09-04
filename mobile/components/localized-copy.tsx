import { Text } from "react-native";
import { useLanguage } from "@/providers/language-provider";
import type { TranslationKey } from "@/i18n";

/** Renders centralized product copy inside an existing React Native Text context. */
export function LocalizedCopy({ copyKey }: { copyKey: TranslationKey }) {
  const { t } = useLanguage();
  return <Text>{t(copyKey)}</Text>;
}
