import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/components/app-screen";
import { NativeFormModal } from "@/components/native-form-modal";
import { NativeDateField } from "@/components/native-date-field";
import { StandardHeader } from "@/components/product-ui";
import { ErrorState, LoadingState } from "@/components/screen-state";
import {
  useDailyMission,
  useJourneyChallenge,
  useJourneyMutations,
  useJourneys,
  useMomentum,
} from "@/hooks/use-journeys";
import { useSubscription } from "@/hooks/use-subscription";
import { PLAN_LIMITS } from "@/lib/entitlements";
import {
  getActiveJourney,
  getChallengeProgress,
  getMissionExecutionTarget,
  getTodayMission,
  journeyStatusLabel,
  getMissionSourceLabel,
  JOURNEY_TEMPLATES,
  missionReason,
  type Journey,
  type JourneyCategory,
} from "@/lib/journeys";
import { isPremiumEntitlement } from "@/lib/subscription";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";

const copy = {
  "pt-BR": {
    title: "Jornadas",
    subtitle: "Transforme objetivos em evolução contínua.",
    newJourney: "+ Nova jornada",
    system: "EVOLUTION SYSTEM",
    systemCopy:
      "Jornadas conecta objetivo, missão diária, Momentum e progresso verificado em um único caminho.",
    active: "ativas",
    completed: "concluídas",
    streak: "sequência",
    weekMomentum: "Momentum / semana",
    currentPath: "CAMINHO PRINCIPAL",
    noPath: "Nenhuma jornada ativa",
    noPathCopy: "Crie um objetivo real ou escolha um programa guiado para começar sua evolução.",
    start: "Criar jornada",
    open: "Abrir jornada",
    todayCheckpoint: "CHECKPOINT DE HOJE",
    noMission: "Nenhuma missão definida para hoje.",
    noMissionCopy:
      "A KIVRYN só mostra ações que existem de verdade no seu sistema. Defina a próxima ação de uma tarefa, estudo, projeto ou jornada.",
    defineAction: "Definir próxima ação",
    intelligence: "KIVRYN JOURNEY INTELLIGENCE",
    intelligenceCopy:
      "Use a KIVRYN para revisar direção, detectar perda de ritmo e decidir o próximo movimento sem inventar progresso.",
    review: "Revisar minhas jornadas",
    plan: "Planejar próximo marco",
    programs: "PROGRAMAS GUIADOS",
    programsTitle: "Estruturas prontas para evoluir com método",
    programsCopy:
      "Programas adicionam etapas persistidas e um caminho verificável para objetivos que precisam de estrutura.",
    explorePrograms: "Explorar programas",
    portfolio: "TODAS AS JORNADAS",
    challenge: "DESAFIO ATUAL",
    refresh: "Atualizar",
    refreshing: "Sincronizando…",
    synced: "Sistema sincronizado",
    target: "Meta",
    noTarget: "Sem data-alvo",
    remaining: "dias restantes",
    overdue: "prazo ultrapassado",
    activeLimit: "Limite de jornadas ativas atingido",
    activeLimitCopy: "Conclua ou pause uma jornada antes de iniciar outra neste plano.",
    newModal: "Nova jornada",
    titlePlaceholder: "O que você quer alcançar?",
    objectivePlaceholder: "Qual mudança concreta define sucesso?",
    privacy: "Seu progresso é construído a partir dos seus próprios registros no KIVRYN.",
  },
  "en-US": {
    title: "Journeys",
    subtitle: "Turn goals into continuous evolution.",
    newJourney: "+ New journey",
    system: "EVOLUTION SYSTEM",
    systemCopy:
      "Journeys connects goals, daily missions, Momentum and verified progress into one path.",
    active: "active",
    completed: "completed",
    streak: "streak",
    weekMomentum: "Momentum / week",
    currentPath: "PRIMARY PATH",
    noPath: "No active journey",
    noPathCopy: "Create a real goal or choose a guided program to start evolving.",
    start: "Create journey",
    open: "Open journey",
    todayCheckpoint: "TODAY'S CHECKPOINT",
    noMission: "No mission defined for today.",
    noMissionCopy:
      "KIVRYN only shows work that actually exists in your system. Define the next action in a task, study, project or journey.",
    defineAction: "Define next action",
    intelligence: "KIVRYN JOURNEY INTELLIGENCE",
    intelligenceCopy:
      "Use KIVRYN to review direction, detect lost momentum and choose the next move without inventing progress.",
    review: "Review my journeys",
    plan: "Plan next milestone",
    programs: "GUIDED PROGRAMS",
    programsTitle: "Structured paths for goals that need a method",
    programsCopy:
      "Programs add persisted stages and a verifiable path for goals that benefit from structure.",
    explorePrograms: "Explore programs",
    portfolio: "ALL JOURNEYS",
    challenge: "CURRENT CHALLENGE",
    refresh: "Refresh",
    refreshing: "Syncing…",
    synced: "System synced",
    target: "Target",
    noTarget: "No target date",
    remaining: "days remaining",
    overdue: "target date passed",
    activeLimit: "Active journey limit reached",
    activeLimitCopy: "Complete or pause a journey before starting another on this plan.",
    newModal: "New journey",
    titlePlaceholder: "What do you want to achieve?",
    objectivePlaceholder: "What concrete change defines success?",
    privacy: "Your progress is built from your own KIVRYN records.",
  },
} as const;

function daysToTarget(targetDate: string | null) {
  if (!targetDate) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(`${targetDate}T12:00:00`).getTime();
  if (!Number.isFinite(target)) return null;
  return Math.ceil((target - start) / 86_400_000);
}

export default function Journeys() {
  const { resolvedLocale } = useLanguage();
  const c = copy[resolvedLocale === "en-US" ? "en-US" : "pt-BR"];
  const locale = resolvedLocale === "en-US" ? "en-US" : "pt-BR";
  const journeys = useJourneys();
  const mission = useDailyMission();
  const momentum = useMomentum();
  const challenge = useJourneyChallenge();
  const subscription = useSubscription();
  const mutations = useJourneyMutations();
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [category, setCategory] = useState<JourneyCategory>("custom");
  const [refreshing, setRefreshing] = useState(false);
  const saving = useRef(false);

  const allJourneys = journeys.data ?? [];
  const active = useMemo(() => allJourneys.filter((j) => j.status === "active"), [allJourneys]);
  const completed = useMemo(
    () => allJourneys.filter((j) => j.status === "completed").length,
    [allJourneys],
  );
  const primaryJourney = getActiveJourney(allJourneys);
  const todayMission = getTodayMission(mission.data);
  const missionTarget = todayMission ? getMissionExecutionTarget(todayMission) : null;
  const premium = isPremiumEntitlement(subscription.data?.entitlement ?? "free");
  const limit = PLAN_LIMITS[premium ? "premium" : "free"].activeJourneys;
  const atLimit = limit !== null && active.length >= limit;

  async function refresh() {
    setRefreshing(true);
    await Promise.allSettled([
      journeys.refetch(),
      mission.refetch(),
      momentum.refetch(),
      challenge.refetch(),
      subscription.refetch(),
    ]);
    setRefreshing(false);
  }

  async function create() {
    if (saving.current || mutations.create.isPending || !title.trim() || !objective.trim()) return;
    if (atLimit) return;
    saving.current = true;
    try {
      await mutations.create.mutateAsync({ title, objective, category, targetDate: date });
      setModal(false);
      setTitle("");
      setObjective("");
      setDate(null);
      setCategory("custom");
    } finally {
      saving.current = false;
    }
  }

  function openJourneyIntelligence(mode: "review" | "milestone") {
    const snapshot = active
      .slice(0, 5)
      .map(
        (item) =>
          `- ${item.title}: ${item.objective.slice(0, 220)} | prazo ${item.targetDate ?? "sem prazo"}`,
      )
      .join("\n");
    const context =
      mode === "review"
        ? `Revise minhas Jornadas usando apenas o estado real abaixo. Detecte perda de direção, conflito de prioridades e qual Jornada merece foco agora. Dê no máximo 3 recomendações práticas. Não invente progresso.\nJornadas ativas: ${active.length}.\nMomentum da semana: ${momentum.data?.weekPoints ?? 0}.\nSequência: ${momentum.data?.streak ?? 0}.\n${snapshot || "Nenhuma Jornada ativa."}`
        : `Ajude a definir o próximo marco verificável da minha Jornada principal. Não diga que alterou o sistema sem uma ação real confirmada.\nJornada: ${primaryJourney?.title ?? "nenhuma"}.\nObjetivo: ${primaryJourney?.objective ?? "não definido"}.\nPrazo: ${primaryJourney?.targetDate ?? "não definido"}.\nMissão atual: ${todayMission?.title ?? "nenhuma"}.`;
    router.push({ pathname: "/assistant", params: { context } });
  }

  if (journeys.isPending) return <LoadingState title="Preparando suas Jornadas…" />;
  if (journeys.isError)
    return (
      <ErrorState
        title="Não foi possível sincronizar Jornadas."
        message="Seus dados não foram alterados. Verifique a conexão e tente novamente."
        actionLabel="Tentar novamente"
        onAction={() => void refresh()}
      />
    );

  return (
    <>
      <AppScreen scroll contentContainerStyle={s.page}>
        <StandardHeader
          title={c.title}
          action={
            <Pressable
              accessibilityRole="button"
              disabled={atLimit}
              onPress={() => setModal(true)}
              style={[s.newButton, atLimit && s.disabled]}
            >
              <Text style={s.newButtonText}>{c.newJourney}</Text>
            </Pressable>
          }
        />
        <Text style={s.subtitle}>{c.subtitle}</Text>

        <View style={s.syncRow}>
          <View style={s.liveDot} />
          <Text style={s.syncText}>{refreshing ? c.refreshing : c.synced}</Text>
          <Pressable accessibilityRole="button" disabled={refreshing} onPress={() => void refresh()}>
            <Text style={s.refresh}>{c.refresh}</Text>
          </Pressable>
        </View>

        <View style={s.systemHero}>
          <Text style={s.eyebrow}>{c.system}</Text>
          <Text style={s.systemTitle}>{c.systemCopy}</Text>
          <View style={s.metricGrid}>
            <Metric value={active.length} label={c.active} />
            <Metric value={completed} label={c.completed} />
            <Metric value={momentum.data?.streak ?? 0} label={c.streak} />
            <Metric value={momentum.data?.weekPoints ?? 0} label={c.weekMomentum} />
          </View>
        </View>

        {atLimit ? (
          <View style={s.limitNotice}>
            <Text style={s.cardTitle}>{c.activeLimit}</Text>
            <Text style={s.muted}>{c.activeLimitCopy}</Text>
          </View>
        ) : null}

        <Section title={c.currentPath}>
          {primaryJourney ? (
            <JourneyHero journey={primaryJourney} locale={locale} copyText={c} />
          ) : (
            <View style={s.emptyHero}>
              <Text style={s.cardTitle}>{c.noPath}</Text>
              <Text style={s.muted}>{c.noPathCopy}</Text>
              <Pressable
                accessibilityRole="button"
                disabled={atLimit}
                onPress={() => setModal(true)}
                style={s.button}
              >
                <Text style={s.buttonText}>{c.start}</Text>
              </Pressable>
            </View>
          )}
        </Section>

        <Section title={c.todayCheckpoint}>
          {mission.isPending ? (
            <View style={s.card}>
              <Text style={s.muted}>{c.refreshing}</Text>
            </View>
          ) : todayMission ? (
            <View style={s.checkpoint}>
              <Text style={s.checkpointSource}>
                {getMissionSourceLabel(todayMission)} · {missionReason(todayMission)}
              </Text>
              <Text style={s.checkpointTitle}>{todayMission.title}</Text>
              {todayMission.description ? (
                <Text style={s.muted}>{todayMission.description}</Text>
              ) : null}
              {todayMission.momentumValue > 0 ? (
                <Text style={s.reward}>+{todayMission.momentumValue} Momentum</Text>
              ) : null}
              {missionTarget ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(missionTarget.href)}
                  style={s.button}
                >
                  <Text style={s.buttonText}>{missionTarget.label}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={s.card}>
              <Text style={s.cardTitle}>{c.noMission}</Text>
              <Text style={s.muted}>{c.noMissionCopy}</Text>
              <Pressable onPress={() => router.push("/productivity")}>
                <Text style={s.link}>{c.defineAction}</Text>
              </Pressable>
            </View>
          )}
        </Section>

        <Section title={c.intelligence}>
          <View style={s.intelligenceCard}>
            <Text style={s.muted}>{c.intelligenceCopy}</Text>
            <View style={s.intelligenceActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => openJourneyIntelligence("review")}
                style={s.aiPrimary}
              >
                <Text style={s.buttonText}>✦ {c.review}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!primaryJourney}
                onPress={() => openJourneyIntelligence("milestone")}
                style={[s.aiSecondary, !primaryJourney && s.disabled]}
              >
                <Text style={s.aiSecondaryText}>{c.plan}</Text>
              </Pressable>
            </View>
          </View>
        </Section>

        <Section title={c.programs}>
          <Pressable accessibilityRole="button" onPress={() => router.push("/packs")} style={s.programCard}>
            <View style={s.programMark}>
              <Text style={s.programMarkText}>↗</Text>
            </View>
            <View style={s.flex}>
              <Text style={s.cardTitle}>{c.programsTitle}</Text>
              <Text style={s.muted}>{c.programsCopy}</Text>
              <Text style={s.link}>{c.explorePrograms}</Text>
            </View>
          </Pressable>
        </Section>

        {challenge.data ? (
          <Section title={c.challenge}>
            <ChallengeCard challenge={challenge.data} locale={locale} />
          </Section>
        ) : null}

        {allJourneys.length ? (
          <Section title={c.portfolio}>
            {allJourneys.map((journey) => (
              <JourneyRow key={journey.id} journey={journey} locale={locale} copyText={c} />
            ))}
          </Section>
        ) : null}

        <Text style={s.privacy}>{c.privacy}</Text>
      </AppScreen>

      <NativeFormModal
        visible={modal}
        title={c.newModal}
        value={title}
        placeholder={c.titlePlaceholder}
        secondaryValue={objective}
        secondaryPlaceholder={c.objectivePlaceholder}
        busy={mutations.create.isPending}
        error={mutations.create.error?.message ?? null}
        errorMessage={mutations.create.error?.message}
        onChange={setTitle}
        onSecondaryChange={setObjective}
        onClose={() => {
          if (!mutations.create.isPending) setModal(false);
        }}
        onSave={() => void create()}
      >
        <NativeDateField value={date} onChange={setDate} />
        <View style={s.chips}>
          {JOURNEY_TEMPLATES.map((template) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: category === template.category }}
              key={template.category}
              onPress={() => setCategory(template.category)}
              style={[s.chip, category === template.category && s.chipSelected]}
            >
              <Text style={s.chipText}>{template.label}</Text>
            </Pressable>
          ))}
        </View>
      </NativeFormModal>
    </>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <View style={s.metricBox}>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

function JourneyHero({
  journey,
  locale,
  copyText,
}: {
  journey: Journey;
  locale: "pt-BR" | "en-US";
  copyText: (typeof copy)["pt-BR"] | (typeof copy)["en-US"];
}) {
  const days = daysToTarget(journey.targetDate);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/journeys/${journey.id}`)}
      style={s.pathHero}
    >
      <View style={s.pathTop}>
        <Text style={s.pathCategory}>{journey.category.toUpperCase()}</Text>
        <Text style={s.statusPill}>{journeyStatusLabel(journey.status)}</Text>
      </View>
      <Text style={s.pathTitle}>{journey.title}</Text>
      <Text style={s.pathObjective}>{journey.objective}</Text>
      <View style={s.pathMetaRow}>
        <Text style={s.pathMeta}>
          {journey.targetDate
            ? `${copyText.target}: ${new Date(`${journey.targetDate}T12:00:00`).toLocaleDateString(locale)}`
            : copyText.noTarget}
        </Text>
        {days !== null ? (
          <Text style={[s.pathMeta, days < 0 && s.danger]}>
            {days < 0 ? copyText.overdue : `${Math.max(0, days)} ${copyText.remaining}`}
          </Text>
        ) : null}
      </View>
      <Text style={s.openLink}>{copyText.open} →</Text>
    </Pressable>
  );
}

function JourneyRow({
  journey,
  locale,
  copyText,
}: {
  journey: Journey;
  locale: "pt-BR" | "en-US";
  copyText: (typeof copy)["pt-BR"] | (typeof copy)["en-US"];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/journeys/${journey.id}`)}
      style={s.journeyRow}
    >
      <View style={s.rowMarker} />
      <View style={s.flex}>
        <View style={s.rowTop}>
          <Text numberOfLines={1} style={s.rowTitle}>
            {journey.title}
          </Text>
          <Text style={s.rowStatus}>{journeyStatusLabel(journey.status)}</Text>
        </View>
        <Text numberOfLines={2} style={s.rowObjective}>
          {journey.objective}
        </Text>
        <Text style={s.rowMeta}>
          {journey.targetDate
            ? `${copyText.target}: ${new Date(`${journey.targetDate}T12:00:00`).toLocaleDateString(locale)}`
            : copyText.noTarget}
        </Text>
      </View>
      <Text style={s.chevron}>›</Text>
    </Pressable>
  );
}

function ChallengeCard({
  challenge,
  locale,
}: {
  challenge: NonNullable<ReturnType<typeof useJourneyChallenge>["data"]>;
  locale: "pt-BR" | "en-US";
}) {
  const progress = getChallengeProgress(challenge);
  return (
    <View style={s.challengeCard}>
      <View style={s.rowTop}>
        <Text style={s.cardTitle}>{challenge.title}</Text>
        <Text style={s.challengePercent}>{progress.percentage}%</Text>
      </View>
      <Text style={s.muted}>{challenge.description}</Text>
      <View style={s.track}>
        <View style={[s.fill, { width: `${progress.percentage}%` }]} />
      </View>
      <View style={s.pathMetaRow}>
        <Text style={s.pathMeta}>
          {progress.progress} / {progress.target}
        </Text>
        <Text style={s.pathMeta}>{new Date(challenge.endsAt).toLocaleDateString(locale)}</Text>
      </View>
      <Text style={s.reward}>+{challenge.rewardPoints} Momentum</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.eyebrow}>{title}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  page: { gap: spacing.lg, paddingBottom: spacing.xxl },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: -spacing.sm },
  syncRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  syncText: { ...typography.caption, color: colors.textMuted, flex: 1 },
  refresh: { ...typography.label, color: colors.primaryBright, paddingVertical: spacing.xs },
  newButton: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  newButtonText: { ...typography.label, color: colors.text },
  disabled: { opacity: 0.45 },
  systemHero: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  systemTitle: { ...typography.heading, color: colors.text, lineHeight: 28 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metricBox: {
    width: "48%",
    minHeight: 78,
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  metricValue: { ...typography.title, color: colors.text },
  metricLabel: { ...typography.caption, color: colors.textMuted },
  section: { gap: spacing.sm },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  pathHero: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryBright,
    backgroundColor: colors.surface,
  },
  pathTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  pathCategory: { ...typography.eyebrow, color: colors.primaryBright },
  statusPill: {
    ...typography.caption,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.accentMuted,
  },
  pathTitle: { ...typography.display, fontSize: 31, lineHeight: 36, color: colors.text },
  pathObjective: { ...typography.body, color: colors.textMuted },
  pathMetaRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: spacing.sm },
  pathMeta: { ...typography.caption, color: colors.textMuted },
  openLink: { ...typography.label, color: colors.primaryBright },
  danger: { color: colors.danger },
  emptyHero: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  checkpoint: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryBright,
  },
  checkpointSource: { ...typography.caption, color: colors.primaryBright },
  checkpointTitle: { ...typography.heading, color: colors.text },
  intelligenceCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  intelligenceActions: { gap: spacing.sm },
  aiPrimary: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  aiSecondary: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryBright,
  },
  aiSecondaryText: { ...typography.label, color: colors.primaryBright },
  programCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  programMark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentMuted,
  },
  programMarkText: { fontSize: 24, color: colors.primaryBright },
  challengeCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  challengePercent: { ...typography.heading, color: colors.primaryBright },
  journeyRow: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowMarker: { width: 3, height: 46, borderRadius: 2, backgroundColor: colors.primaryBright },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  rowTitle: { ...typography.heading, color: colors.text, flex: 1 },
  rowStatus: { ...typography.caption, color: colors.primaryBright },
  rowObjective: { ...typography.body, color: colors.textMuted },
  rowMeta: { ...typography.caption, color: colors.textMuted },
  chevron: { fontSize: 24, color: colors.textMuted },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardTitle: { ...typography.heading, color: colors.text },
  muted: { ...typography.body, color: colors.textMuted },
  reward: { ...typography.label, color: colors.primaryBright },
  link: { ...typography.label, color: colors.primaryBright, paddingVertical: spacing.xs },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  buttonText: { ...typography.label, color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.accentMuted },
  chipText: { ...typography.caption, color: colors.text },
  track: {
    height: 7,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  fill: { height: "100%", backgroundColor: colors.primaryBright },
  privacy: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
  limitNotice: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  flex: { flex: 1, gap: spacing.xs },
});