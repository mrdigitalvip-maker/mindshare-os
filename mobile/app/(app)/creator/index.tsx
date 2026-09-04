import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppScreen } from "@/components/app-screen";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { listCreatorProjects, type CreatorProject } from "@/services/creator-service";
import { colors, radius, spacing, typography } from "@/lib/theme";
export default function CreatorCenter() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const [projects, setProjects] = useState<CreatorProject[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (session?.user.id)
      void listCreatorProjects(session.user.id)
        .then(setProjects)
        .catch(() => setError(true));
  }, [session?.user.id]);
  return (
    <AppScreen scroll contentContainerStyle={s.page}>
      <Text style={s.eyebrow}>{t("creator.title")}</Text>
      <Text style={s.title}>{t("creator.tagline")}</Text>
      <Text style={s.heading}>{t("creator.studio")}</Text>
      <Text style={s.copy}>{t("creator.foundation")}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("creator.new")}
        style={s.button}
        onPress={() => router.push("/creator/new")}
      >
        <Text style={s.buttonText}>{t("creator.new")}</Text>
      </Pressable>
      <View style={s.card}>
        <Text style={s.heading}>{t("creator.ideas")}</Text>
        <Text style={s.copy}>{t("creator.ideasBody")}</Text>
      </View>
      <View style={s.card}>
        <Text style={s.heading}>{t("creator.guide")}</Text>
        <Text style={s.copy}>{t("creator.guideBody")}</Text>
      </View>
      <Text style={s.heading}>{t("creator.recent")}</Text>
      {error ? (
        <Text style={s.error}>{t("creator.loadError")}</Text>
      ) : projects.length === 0 ? (
        <Text style={s.copy}>{t("creator.empty")}</Text>
      ) : (
        projects.map((p) => (
          <Pressable key={p.id} style={s.card} onPress={() => router.push(`/creator/${p.id}`)}>
            <Text style={s.heading}>{p.title}</Text>
            <Text style={s.copy}>{p.status}</Text>
          </Pressable>
        ))
      )}
    </AppScreen>
  );
}
const s = StyleSheet.create({
  page: { gap: spacing.md, paddingBottom: spacing.xl },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  title: { ...typography.title, color: colors.text },
  heading: { ...typography.heading, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  buttonText: { ...typography.body, color: colors.text, fontWeight: "700" },
  error: { ...typography.body, color: colors.danger },
});
