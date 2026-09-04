import { useEffect, useState } from "react";
import { Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { AppScreen } from "@/components/app-screen";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { getCreatorProject, type CreatorProject } from "@/services/creator-service";
import { colors, spacing, typography } from "@/lib/theme";
export default function CreatorProjectScreen() {
  const params = useLocalSearchParams<{ projectId?: string | string[] }>();
  const id = typeof params.projectId === "string" ? params.projectId : "";
  const { session } = useAuth();
  const { t } = useLanguage();
  const [p, setP] = useState<CreatorProject | null>();
  useEffect(() => {
    if (session?.user.id && id)
      void getCreatorProject(session.user.id, id)
        .then(setP)
        .catch(() => setP(null));
    else setP(null);
  }, [id, session?.user.id]);
  return (
    <AppScreen scroll contentContainerStyle={s.page}>
      {p === undefined ? (
        <Text style={s.copy}>{t("common.loading")}</Text>
      ) : p === null ? (
        <Text style={s.title}>{t("creator.invalidRoute")}</Text>
      ) : (
        <>
          <Text style={s.title}>{p.title}</Text>
          <Text style={s.copy}>
            {t("creator.aspect")}: {p.aspectRatio}
          </Text>
          <Text style={s.copy}>
            {t("creator.captions")}:{" "}
            {p.captionsEnabled ? t("creator.captionsAuto") : t("creator.captionsOff")}
          </Text>
          <Text style={s.copy}>{t("creator.foundation")}</Text>
        </>
      )}
    </AppScreen>
  );
}
const s = StyleSheet.create({
  page: { gap: spacing.md },
  title: { ...typography.title, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted },
});
