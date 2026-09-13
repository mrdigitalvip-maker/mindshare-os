import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { ErrorState, LoadingState } from "@/components/screen-state";
import {
  usePassportHome,
  useUpdatePassportDailyMissionStatus,
} from "@/hooks/use-passport";
import type { PassportDailyMission, PassportMissionType } from "@/lib/passport";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";

const copy = {
  "pt-BR": {
    title: "Missões do Passport",
    subtitle: "Execute ações curtas e reais para avançar sua preparação internacional.",
    loading: "Carregando missões de hoje…",
    errorTitle: "Não foi possível carregar suas missões.",
    errorBody: "Seus dados não foram alterados. Verifique a conexão e tente novamente.",
    retry: "Tentar novamente",
    back: "Voltar ao Passport",
    noProfileTitle: "Configure seu Passport primeiro",
    noProfileBody: "As missões diárias usam o idioma e o plano do seu Passport.",
    configure: "Configurar Passport",
    system: "DAILY READINESS",
    today: "Plano de hoje",
    todayBody: "Conclua apenas o que você realmente executou. O Passport não estima progresso.",
    pending: "Pendentes",
    completed: "Concluídas",
    skipped: "Puladas",
    emptyTitle: "Nenhuma missão para hoje",
    emptyBody: "Ainda não existem missões persistidas para esta data. O Passport não vai inventar tarefas para preencher a tela.",
    complete: "Marcar como concluída",
    completing: "Salvando…",
    skip: "Pular missão",
    skipping: "Pulando…",
    mutationError: "Não foi possível atualizar esta missão. Tente novamente.",
    openReview: "Abrir revisão de vocabulário",
    openRoleplay: "Abrir prática de conversa",
    culture: "Cultura",
    listening: "Listening",
    vocabulary: "Vocabulário",
    speaking: "Conversação",
    travel: "Viagem",
    statusPending: "Pendente",
    statusCompleted: "Concluída",
    statusSkipped: "Pulada",
    completedAt: "Concluída em",
  },
  en: {
    title: "Passport missions",
    subtitle: "Execute short, real actions that move your international readiness forward.",
    loading: "Loading today's missions…",
    errorTitle: "Your missions could not be loaded.",
    errorBody: "Your data was not changed. Check the connection and try again.",
    retry: "Try again",
    back: "Back to Passport",
    noProfileTitle: "Set up your Passport first",
    noProfileBody: "Daily missions use your Passport language and plan.",
    configure: "Set up Passport",
    system: "DAILY READINESS",
    today: "Today's plan",
    todayBody: "Only complete work you actually performed. Passport does not estimate progress.",
    pending: "Pending",
    completed: "Completed",
    skipped: "Skipped",
    emptyTitle: "No missions for today",
    emptyBody: "There are no persisted missions for this date yet. Passport will not invent tasks just to fill the screen.",
    complete: "Mark completed",
    completing: "Saving…",
    skip: "Skip mission",
    skipping: "Skipping…",
    mutationError: "This mission could not be updated. Try again.",
    openReview: "Open vocabulary review",
    openRoleplay: "Open conversation practice",
    culture: "Culture",
    listening: "Listening",
    vocabulary: "Vocabulary",
    speaking: "Speaking",
    travel: "Travel",
    statusPending: "Pending",
    statusCompleted: "Completed",
    statusSkipped: "Skipped",
    completedAt: "Completed on",
  },
} as const;

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value: string, locale: "pt-BR" | "en") {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString(locale === "en" ? "en-US" : "pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PassportMissionsScreen() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const missionDate = useMemo(localDateKey, []);
  const passport = usePassportHome(missionDate);
  const updateMission = useUpdatePassportDailyMissionStatus();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<"completed" | "skipped" | null>(null);

  if (passport.isPending) return <LoadingState title={text.loading} />;
  if (passport.isError) {
    return (
      <ErrorState
        title={text.errorTitle}
        message={text.errorBody}
        actionLabel={text.retry}
        onAction={() => void passport.refetch()}
      />
    );
  }

  const profile = passport.data?.profile ?? null;
  if (!profile) {
    return (
      <AppScreen scroll contentContainerStyle={styles.page}>
        <StandardHeader title={text.title} subtitle={text.subtitle} />
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>{text.noProfileTitle}</Text>
          <Text style={styles.stateBody}>{text.noProfileBody}</Text>
          <PrimaryButton label={text.configure} onPress={() => router.replace("/passport/setup")} />
        </View>
      </AppScreen>
    );
  }

  const missions = passport.data?.missions ?? [];
  const pending = missions.filter((mission) => mission.status === "pending").length;
  const completed = missions.filter((mission) => mission.status === "completed").length;
  const skipped = missions.filter((mission) => mission.status === "skipped").length;

  async function changeStatus(missionId: string, status: "completed" | "skipped") {
    if (updateMission.isPending) return;
    setUpdatingId(missionId);
    setUpdatingStatus(status);
    updateMission.reset();
    try {
      await updateMission.mutateAsync({ missionId, status });
    } catch {
      // Mutation state renders the failure without changing the mission locally.
    } finally {
      setUpdatingId(null);
      setUpdatingStatus(null);
    }
  }

  return (
    <AppScreen scroll contentContainerStyle={styles.page}>
      <StandardHeader title={text.title} subtitle={text.subtitle} />

      <Pressable accessibilityRole="button" onPress={() => router.replace("/passport")} style={styles.backButton}>
        <Text style={styles.backText}>‹ {text.back}</Text>
      </Pressable>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{text.system}</Text>
        <Text style={styles.heroTitle}>{text.today}</Text>
        <Text style={styles.heroBody}>{text.todayBody}</Text>
        <View style={styles.metricsRow}>
          <Metric label={text.pending} value={String(pending)} />
          <Metric label={text.completed} value={String(completed)} />
          <Metric label={text.skipped} value={String(skipped)} />
        </View>
      </View>

      {updateMission.isError ? (
        <View style={styles.errorCard} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{text.mutationError}</Text>
        </View>
      ) : null}

      {missions.length ? (
        <View style={styles.missionList}>
          {missions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              text={text}
              locale={resolvedLocale}
              busy={updatingId === mission.id}
              busyStatus={updatingId === mission.id ? updatingStatus : null}
              onComplete={() => void changeStatus(mission.id, "completed")}
              onSkip={() => void changeStatus(mission.id, "skipped")}
            />
          ))}
        </View>
      ) : (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>{text.emptyTitle}</Text>
          <Text style={styles.stateBody}>{text.emptyBody}</Text>
        </View>
      )}
    </AppScreen>
  );
}

function MissionCard({
  mission,
  text,
  locale,
  busy,
  busyStatus,
  onComplete,
  onSkip,
}: {
  mission: PassportDailyMission;
  text: (typeof copy)[keyof typeof copy];
  locale: "pt-BR" | "en";
  busy: boolean;
  busyStatus: "completed" | "skipped" | null;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const pending = mission.status === "pending";
  const statusText =
    mission.status === "completed"
      ? text.statusCompleted
      : mission.status === "skipped"
        ? text.statusSkipped
        : text.statusPending;

  return (
    <View style={[styles.missionCard, mission.status === "completed" && styles.missionCompleted]}>
      <View style={styles.missionHeader}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{missionTypeLabel(mission.missionType, text)}</Text>
        </View>
        <Text
          style={[
            styles.statusText,
            mission.status === "completed" && styles.statusCompleted,
            mission.status === "skipped" && styles.statusSkipped,
          ]}
        >
          {statusText}
        </Text>
      </View>

      <Text style={styles.missionTitle}>{mission.title}</Text>
      {mission.prompt ? <Text style={styles.missionPrompt}>{mission.prompt}</Text> : null}

      {mission.completedAt ? (
        <Text style={styles.completedAt}>
          {text.completedAt} {formatDateTime(mission.completedAt, locale)}
        </Text>
      ) : null}

      {pending ? (
        <>
          {mission.missionType === "vocabulary" ? (
            <SecondaryButton label={text.openReview} onPress={() => router.push("/passport/review")} />
          ) : null}
          {mission.missionType === "speaking" ? (
            <SecondaryButton label={text.openRoleplay} onPress={() => router.push("/passport/roleplay")} />
          ) : null}

          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onSkip}
              style={({ pressed }) => [styles.skipButton, busy && styles.disabled, pressed && styles.pressed]}
            >
              <Text style={styles.skipButtonText}>
                {busy && busyStatus === "skipped" ? text.skipping : text.skip}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onComplete}
              style={({ pressed }) => [styles.completeButton, busy && styles.disabled, pressed && styles.pressed]}
            >
              <Text style={styles.completeButtonText}>
                {busy && busyStatus === "completed" ? text.completing : text.complete}
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

function missionTypeLabel(type: PassportMissionType, text: (typeof copy)[keyof typeof copy]) {
  switch (type) {
    case "culture":
      return text.culture;
    case "listening":
      return text.listening;
    case "vocabulary":
      return text.vocabulary;
    case "speaking":
      return text.speaking;
    case "travel":
      return text.travel;
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
      <Text style={styles.secondaryButtonText}>{label} →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: spacing.xl },
  backButton: { alignSelf: "flex-start", marginTop: spacing.md, paddingVertical: spacing.sm },
  backText: { ...typography.label, color: colors.textSecondary },
  hero: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.surface,
  },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  heroTitle: { ...typography.title, color: colors.text, marginTop: spacing.sm },
  heroBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  metricsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  metric: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.canvasElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: { ...typography.caption, color: colors.textMuted },
  metricValue: { ...typography.heading, color: colors.text, marginTop: spacing.xs },
  missionList: { gap: spacing.md, marginTop: spacing.md },
  missionCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  missionCompleted: { borderColor: colors.success },
  missionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.canvasElevated,
    borderWidth: 1,
    borderColor: colors.borderActive,
  },
  typeText: { ...typography.caption, color: colors.primaryBright },
  statusText: { ...typography.caption, color: colors.warning },
  statusCompleted: { color: colors.success },
  statusSkipped: { color: colors.textMuted },
  missionTitle: { ...typography.heading, color: colors.text, marginTop: spacing.md },
  missionPrompt: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  completedAt: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  secondaryButton: {
    minHeight: 46,
    marginTop: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.canvasElevated,
  },
  secondaryButtonText: { ...typography.label, color: colors.primaryBright },
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  skipButton: {
    flex: 1,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  skipButtonText: { ...typography.label, color: colors.textSecondary },
  completeButton: {
    flex: 1.4,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  completeButtonText: { ...typography.label, color: colors.text },
  errorCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  errorText: { ...typography.caption, color: colors.danger },
  stateCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stateTitle: { ...typography.heading, color: colors.text },
  stateBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  primaryButton: {
    minHeight: 52,
    marginTop: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  primaryButtonText: { ...typography.label, color: colors.text },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
});
