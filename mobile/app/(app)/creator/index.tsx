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
      <CreatorSection
        title={t("creator.create")}
        items={[
          t("creator.studio"),
          t("creator.hookLab"),
          t("creator.captionSeo"),
          t("creator.profileBuilder"),
          t("creator.contentIdeas"),
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("creator.new")}
        style={s.button}
        onPress={() => router.push("/creator/new")}
      >
        <Text style={s.buttonText}>{t("creator.new")}</Text>
      </Pressable>
      <CreatorSection
        title={t("creator.plan")}
        items={[
          t("creator.setup"),
          t("creator.strategy"),
          t("creator.pillars"),
          t("creator.postingPlan"),
          t("creator.goals"),
        ]}
      />
      <CreatorSection
        title={t("creator.learn")}
        items={[t("creator.academy"), t("creator.start"), t("creator.growth"), t("creator.pro")]}
      />
      <CreatorSection
        title={t("creator.analyze")}
        items={[
          t("creator.analytics"),
          t("creator.contentScore"),
          t("creator.retention"),
          t("creator.history"),
        ]}
        note={t("creator.noAnalytics")}
      />
      <CreatorSection
        title={t("creator.intelligence")}
        items={[t("creator.map"), t("creator.globalBenchmark"), t("creator.yourAudience")]}
        note={t("creator.noBenchmarks")}
      />
      <CreatorSection
        title={t("creator.media")}
        items={[
          t("creator.library"),
          t("creator.upload"),
          t("creator.authorizedImports"),
          t("creator.sourceStatus"),
        ]}
        note={t("creator.authImport")}
      />
      <CreatorSection
        title={t("creator.ai")}
        items={[t("creator.copilot"), t("creator.hookLab")]}
        note={t("creator.noGenerated")}
      />
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
function CreatorSection({ title, items, note }: { title: string; items: string[]; note?: string }) {
  return (
    <View style={s.card} accessibilityLabel={title}>
      <Text style={s.heading}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={s.copy}>
          • {item}
        </Text>
      ))}
      {note ? <Text style={s.notice}>{note}</Text> : null}
    </View>
  );
}
const s = StyleSheet.create({
  page: { gap: spacing.md, paddingBottom: spacing.xl },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  title: { ...typography.title, color: colors.text },
  heading: { ...typography.heading, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted },
  notice: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
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
