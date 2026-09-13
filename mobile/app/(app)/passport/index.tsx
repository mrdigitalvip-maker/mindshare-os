import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { usePassportHome } from "@/hooks/use-passport";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";

const copy = {
  "pt-BR": {
    title: "KIVRYN Passport",
    subtitle: "Prepare-se para se comunicar, viajar e agir com confiança.",
    system: "INTERNATIONAL READINESS SYSTEM",
    noProfile: "Seu Passport ainda não foi configurado",
    noProfileCopy: "Escolha um idioma, faça o teste de nível e deixe a KIVRYN montar seu plano internacional.",
    language: "Idioma",
    level: "Nível",
    progress: "Progresso",
    lessons: "Lições",
    vocabulary: "Revisões",
    missions: "Missões de hoje",
    nextLesson: "PRÓXIMA LIÇÃO",
    nothingNext: "Nenhuma lição disponível agora.",
    openLesson: "Abrir lição",
    dailyMission: "MISSÃO DE HOJE",
    noMission: "Nenhuma missão criada para hoje.",
    reviewQueue: "VOCABULÁRIO PARA REVISAR",
    allClear: "Tudo revisado por enquanto.",
    reviewNow: "Revisar agora",
    roleplay: "ROLE-PLAY COM IA",
    roleplayTitle: "Pratique situações reais",
    roleplayBody: "Aeroporto, hotel, restaurante, transporte e outros cenários no seu idioma e nível atuais.",
    roleplayAction: "Praticar conversa",
    refresh: "Atualizar",
    completed: "concluídas",
    pending: "pendentes",
  },
  "en-US": {
    title: "KIVRYN Passport",
    subtitle: "Get ready to communicate, travel and act with confidence.",
    system: "INTERNATIONAL READINESS SYSTEM",
    noProfile: "Your Passport is not configured yet",
    noProfileCopy: "Choose a language, take the placement test and let KIVRYN build your international plan.",
    language: "Language",
    level: "Level",
    progress: "Progress",
    lessons: "Lessons",
    vocabulary: "Reviews",
    missions: "Today's missions",
    nextLesson: "NEXT LESSON",
    nothingNext: "No lesson is available right now.",
    openLesson: "Open lesson",
    dailyMission: "TODAY'S MISSION",
    noMission: "No mission was created for today.",
    reviewQueue: "VOCABULARY TO REVIEW",
    allClear: "You're all caught up for now.",
    reviewNow: "Review now",
    roleplay: "AI ROLE-PLAY",
    roleplayTitle: "Practice real situations",
    roleplayBody: "Airport, hotel, restaurant, transport and other scenarios at your current language and level.",
    roleplayAction: "Practice conversation",
    refresh: "Refresh",
    completed: "completed",
    pending: "pending",
  },
} as const;

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function PassportHome() {
  const { resolvedLocale } = useLanguage();
  const c = copy[resolvedLocale === "en" ? "en-US" : "pt-BR"];
  const missionDate = useMemo(localDateKey, []);
  const passport = usePassportHome(missionDate);

  if (passport.isPending) return <LoadingState title="Preparing KIVRYN Passport…" />;
  if (passport.isError) {
    return (
      <ErrorState
        title="KIVRYN Passport could not be synchronized."
        message="Your Passport data was not changed. Check the connection and try again."
        actionLabel={c.refresh}
        onAction={() => passport.refetch()}
      />
    );
  }

  const data = passport.data;
  const profile = data?.profile ?? null;
  const track = profile ? data?.tracks.find((item) => item.id === profile.trackId) ?? null : null;
  const nextLesson = data?.lessons.find((lesson) => lesson.status !== "completed") ?? null;
  const nextMission = data?.missions.find((mission) => mission.status === "pending") ?? null;
  const dueVocabulary = data?.dueVocabulary ?? [];

  return (
    <AppScreen scroll>
      <StandardHeader title={c.title} subtitle={c.subtitle} />

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{c.system}</Text>
        {profile ? (
          <>
            <View style={styles.heroRow}>
              <View>
                <Text style={styles.language}>{track?.title ?? c.language}</Text>
                <Text style={styles.level}>{c.level} {profile.currentLevel}</Text>
              </View>
              <View style={styles.progressBadge}>
                <Text style={styles.progressValue}>{data?.progressPercent ?? 0}%</Text>
                <Text style={styles.progressLabel}>{c.progress}</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, data?.progressPercent ?? 0)}%` }]} />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.emptyTitle}>{c.noProfile}</Text>
            <Text style={styles.emptyCopy}>{c.noProfileCopy}</Text>
          </>
        )}
      </View>

      {profile ? (
        <>
          <View style={styles.metrics}>
            <Metric label={c.lessons} value={`${data?.completedLessons ?? 0}/${data?.lessons.length ?? 0}`} detail={c.completed} />
            <Metric label={c.vocabulary} value={String(dueVocabulary.length)} detail={c.pending} />
            <Metric label={c.missions} value={`${data?.completedMissions ?? 0}/${data?.missions.length ?? 0}`} detail={c.completed} />
          </View>

          <Section
            label={c.nextLesson}
            title={nextLesson?.title ?? c.nothingNext}
            body={nextLesson?.description ?? ""}
            actionLabel={nextLesson ? c.openLesson : undefined}
            onPress={
              nextLesson
                ? () =>
                    router.push({
                      pathname: "/passport/lesson/[lessonId]",
                      params: { lessonId: nextLesson.id },
                    })
                : undefined
            }
          />
          <Section label={c.dailyMission} title={nextMission?.title ?? c.noMission} body={nextMission?.prompt ?? ""} />
          <Section
            label={c.reviewQueue}
            title={dueVocabulary[0]?.term ?? c.allClear}
            body={dueVocabulary.length ? `${dueVocabulary.length} ${c.pending}` : ""}
            actionLabel={dueVocabulary.length ? c.reviewNow : undefined}
            onPress={dueVocabulary.length ? () => router.push("/passport/review") : undefined}
          />
          <Section
            label={c.roleplay}
            title={c.roleplayTitle}
            body={c.roleplayBody}
            actionLabel={c.roleplayAction}
            onPress={() => router.push("/passport/roleplay")}
          />
        </>
      ) : null}

      <Pressable style={styles.refreshButton} onPress={() => passport.refetch()}>
        <Text style={styles.refreshText}>{c.refresh}</Text>
      </Pressable>
    </AppScreen>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

function Section({
  label,
  title,
  body,
  actionLabel,
  onPress,
}: {
  label: string;
  title: string;
  body: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      {body ? <Text style={styles.sectionBody}>{body}</Text> : null}
      {actionLabel ? <Text style={styles.sectionAction}>{actionLabel} →</Text> : null}
    </>
  );

  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.section, styles.sectionInteractive, pressed && styles.sectionPressed]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.section}>{content}</View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eyebrow: { ...typography.label, color: colors.primaryBright, marginBottom: spacing.md },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  language: { ...typography.title, color: colors.text },
  level: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  progressBadge: { alignItems: "flex-end" },
  progressValue: { ...typography.title, color: colors.primaryBright },
  progressLabel: { ...typography.caption, color: colors.textSecondary },
  progressTrack: { height: 6, backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, overflow: "hidden", marginTop: spacing.lg },
  progressFill: { height: "100%", backgroundColor: colors.primaryBright, borderRadius: radius.pill },
  emptyTitle: { ...typography.heading, color: colors.text, marginTop: spacing.xs },
  emptyCopy: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  metrics: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  metricCard: { flex: 1, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  metricLabel: { ...typography.caption, color: colors.textSecondary },
  metricValue: { ...typography.heading, color: colors.text, marginTop: spacing.sm },
  metricDetail: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  section: { marginTop: spacing.md, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sectionInteractive: { borderColor: colors.borderActive },
  sectionPressed: { opacity: 0.82 },
  sectionLabel: { ...typography.label, color: colors.primaryBright },
  sectionTitle: { ...typography.heading, color: colors.text, marginTop: spacing.sm },
  sectionBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  sectionAction: { ...typography.label, color: colors.primaryBright, marginTop: spacing.md },
  refreshButton: { marginTop: spacing.lg, marginBottom: spacing.lg, alignItems: "center", justifyContent: "center", paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  refreshText: { ...typography.label, color: colors.text },
});
