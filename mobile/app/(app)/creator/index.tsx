import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppScreen } from "@/components/app-screen";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import {
  listCreatorContent,
  listCreatorManualSnapshots,
  listCreatorProjects,
  loadCreatorProfile,
  loadCreatorStrategy,
  type CreatorProject,
} from "@/services/creator-service";
import { creatorNextAction, type CreatorNextAction } from "@/lib/creator";
import { createTask } from "@/services/workspace-service";
import { colors, radius, spacing, typography } from "@/lib/theme";
export default function CreatorCenter() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const [projects, setProjects] = useState<CreatorProject[]>([]);
  const [error, setError] = useState(false);
  const [nextAction, setNextAction] = useState<CreatorNextAction>("complete_setup");
  useEffect(() => {
    if (session?.user.id)
      void listCreatorProjects(session.user.id)
        .then(setProjects)
        .catch(() => setError(true));
  }, [session?.user.id]);
  useEffect(() => {
    if (session?.user.id)
      void Promise.all([
        loadCreatorProfile(session.user.id),
        loadCreatorStrategy(session.user.id),
        listCreatorContent(session.user.id),
        listCreatorManualSnapshots(session.user.id),
      ]).then(([profile, strategy, content, analytics]) =>
        setNextAction(
          creatorNextAction({
            hasProfile: !!profile,
            hasStrategy: !!strategy,
            contentCount: content.length,
            analyticsSampleCount: analytics.length,
          }),
        ),
      );
  }, [session?.user.id]);
  return (
    <AppScreen scroll contentContainerStyle={s.page}>
      <Text style={s.eyebrow}>{t("creator.title")}</Text>
      <Text style={s.title}>{t("creator.tagline")}</Text>
      <View style={s.card}>
        <Text style={s.heading}>{t("creator.nextAction")}</Text>
        <Text style={s.copy}>{t(`creator.nextAction.${nextAction}`)}</Text>
        <Pressable
          onPress={() =>
            session?.user.id &&
            void createTask(session.user.id, {
              title: t(`creator.nextAction.${nextAction}`),
              description: t("creator.taskDescription"),
            })
          }
        >
          <Text style={s.copy}>＋ {t("creator.createTask")}</Text>
        </Pressable>
      </View>
      <CreatorSection
        title={t("creator.create")}
        items={[
          { label: t("creator.studio"), href: "/creator/new" },
          { label: t("creator.hookLab"), href: "/creator/hook-lab" },
          { label: t("creator.contentIdeas"), href: "/creator/ideas" },
          { label: t("creator.profileBuilder"), href: "/creator/profile" },
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
          { label: t("creator.setup"), href: "/creator/setup" },
          { label: t("creator.strategy"), href: "/creator/strategy" },
          { label: t("creator.pillars"), href: "/creator/pillars" },
          { label: t("creator.goals"), href: "/creator/goals" },
        ]}
      />
      <CreatorSection
        title={t("creator.learn")}
        items={[{ label: t("creator.academy"), href: "/creator/academy" }]}
      />
      <CreatorSection
        title={t("creator.analyze")}
        items={[{ label: t("creator.analytics"), href: "/creator/analytics" }]}
        note={t("creator.noAnalytics")}
      />
      <CreatorSection
        title={t("creator.intelligence")}
        items={[{ label: t("creator.map"), href: "/creator/map" }]}
        note={t("creator.noBenchmarks")}
      />
      <CreatorSection
        title={t("creator.media")}
        items={[
          { label: t("creator.library"), href: "/creator/library" },
          { label: t("creator.upload"), href: "/creator/import" },
        ]}
        note={t("creator.authImport")}
      />
      <CreatorSection
        title={t("creator.ai")}
        items={[
          { label: t("creator.copilot"), href: "/creator/copilot" },
          { label: t("creator.hookLab"), href: "/creator/hook-lab" },
        ]}
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
function CreatorSection({
  title,
  items,
  note,
}: {
  title: string;
  items: { label: string; href: string }[];
  note?: string;
}) {
  return (
    <View style={s.card} accessibilityLabel={title}>
      <Text style={s.heading}>{title}</Text>
      {items.map((item) => (
        <Pressable
          accessibilityRole="link"
          key={item.href}
          onPress={() => router.push(item.href as never)}
        >
          <Text style={s.copy}>› {item.label}</Text>
        </Pressable>
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
