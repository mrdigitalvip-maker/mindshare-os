import { router, useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/components/app-screen";
import { ErrorState, LoadingState } from "@/components/screen-state";
import {
  useDailyMission,
  useJourney,
  useJourneyMutations,
  useJourneyProgram,
  useMomentum,
} from "@/hooks/use-journeys";
import { colors, radius, spacing, typography } from "@/lib/theme";
import {
  getMissionExecutionTarget,
  getTodayMission,
  getMissionSourceLabel,
  journeyStatusLabel,
  missionReason,
  type JourneyProgramState,
} from "@/lib/journeys";
import { useLanguage } from "@/providers/language-provider";

const copy = {
  "pt-BR": {
    back: "‹ Voltar para Jornadas",
    evolution: "JOURNEY EVOLUTION",
    objective: "OBJETIVO",
    target: "Data-alvo",
    started: "Iniciada",
    updated: "Atualizada",
    daysActive: "dias em evolução",
    daysLeft: "dias restantes",
    overdue: "dias além da meta",
    noTarget: "Sem data-alvo",
    checkpoint: "CHECKPOINT ATUAL",
    noCheckpoint: "Nenhuma ação vinculada a esta Jornada hoje.",
    noCheckpointCopy:
      "Defina um próximo movimento verificável. O progresso não é estimado por tempo: ele avança quando existe execução real.",
    planAction: "Planejar próximo movimento",
    verified: "SINAIS VERIFICADOS",
    verifiedCopy:
      "Estes sinais vêm dos registros de Momentum que ainda estão no histórico recente do sistema; não representam um total histórico da Jornada.",
    noSignals: "Nenhum sinal recente desta Jornada no recorte atual.",
    systemMomentum: "Momentum geral do sistema",
    week: "esta semana",
    streak: "dias de sequência",
    intelligence: "KIVRYN JOURNEY INTELLIGENCE",
    intelligenceCopy:
      "A KIVRYN usa objetivo, prazo, etapa atual e missão real para revisar a direção desta Jornada.",
    review: "Revisar direção",
    replan: "Replanejar próximo marco",
    connected: "SISTEMA CONECTADO",
    connectedCopy:
      "A missão de uma Jornada pode apontar para Tarefas, Estudos, Projetos ou uma ação própria. Quando você executa a origem real, o sistema inteiro se atualiza.",
    programLoading: "Carregando programa…",
    programError: "Não foi possível carregar as etapas deste programa.",
    retry: "Tentar novamente",
    programDone: "PROGRAMA CONCLUÍDO",
    programRunning: "PROGRAMA EM ANDAMENTO",
    stagesDone: "etapas concluídas",
    nextStage: "PRÓXIMA ETAPA",
    currentMission: "MISSÃO ATIVA DESTA ETAPA",
    confirmStage: "Confirmar etapa concluída",
    confirming: "Confirmando…",
    noMissionForStage: "Esta etapa ainda não é a missão ativa de hoje.",
    programMap: "MAPA DA JORNADA",
    done: "Concluída",
    now: "Agora",
    next: "Próxima",
    pause: "Pausar Jornada",
    resume: "Retomar Jornada",
    complete: "Concluir Jornada",
    statusError: "Não foi possível alterar o estado da Jornada.",
  },
  "en-US": {
    back: "‹ Back to Journeys",
    evolution: "JOURNEY EVOLUTION",
    objective: "OBJECTIVE",
    target: "Target date",
    started: "Started",
    updated: "Updated",
    daysActive: "days evolving",
    daysLeft: "days remaining",
    overdue: "days past target",
    noTarget: "No target date",
    checkpoint: "CURRENT CHECKPOINT",
    noCheckpoint: "No action is linked to this Journey today.",
    noCheckpointCopy:
      "Define a verifiable next move. Progress is not estimated from time; it advances through real execution.",
    planAction: "Plan next move",
    verified: "VERIFIED SIGNALS",
    verifiedCopy:
      "These signals come from Momentum records still present in the system's recent history; they are not a lifetime total for this Journey.",
    noSignals: "No recent signal for this Journey in the current window.",
    systemMomentum: "System-wide Momentum",
    week: "this week",
    streak: "day streak",
    intelligence: "KIVRYN JOURNEY INTELLIGENCE",
    intelligenceCopy:
      "KIVRYN uses the objective, deadline, current stage and real mission to review this Journey's direction.",
    review: "Review direction",
    replan: "Replan next milestone",
    connected: "CONNECTED SYSTEM",
    connectedCopy:
      "A Journey mission can point to Tasks, Studies, Projects or a Journey action. Executing the real source updates the whole system.",
    programLoading: "Loading program…",
    programError: "Unable to load this program's stages.",
    retry: "Try again",
    programDone: "PROGRAM COMPLETE",
    programRunning: "PROGRAM IN PROGRESS",
    stagesDone: "stages complete",
    nextStage: "NEXT STAGE",
    currentMission: "ACTIVE MISSION FOR THIS STAGE",
    confirmStage: "Confirm stage complete",
    confirming: "Confirming…",
    noMissionForStage: "This stage is not today's active mission yet.",
    programMap: "JOURNEY MAP",
    done: "Completed",
    now: "Now",
    next: "Next",
    pause: "Pause Journey",
    resume: "Resume Journey",
    complete: "Complete Journey",
    statusError: "Unable to change Journey status.",
  },
} as const;

function dayDiff(from: string, to = new Date()) {
  const start = new Date(`${from}T12:00:00`).getTime();
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 12).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

function targetDiff(targetDate: string | null) {
  if (!targetDate) return null;
  const today = new Date();
  const target = new Date(`${targetDate}T12:00:00`).getTime();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).getTime();
  if (!Number.isFinite(target)) return null;
  return Math.ceil((target - current) / 86_400_000);
}

export default function JourneyDetail() {
  const { resolvedLocale } = useLanguage();
  const c = copy[resolvedLocale === "en" ? "en-US" : "pt-BR"];
  const locale = resolvedLocale === "en" ? "en-US" : "pt-BR";
  const { journeyId } = useLocalSearchParams<{ journeyId: string }>();
  const journey = useJourney(journeyId ?? "");
  const mission = useDailyMission();
  const momentum = useMomentum();
  const program = useJourneyProgram(journeyId ?? "", journey.data?.sourcePackId);
  const mutations = useJourneyMutations();
  const completionGuard = useRef(false);

  if (journey.isPending) return <LoadingState title="Carregando Jornada…" />;
  if (journey.isError)
    return (
      <ErrorState
        title="Jornada indisponível."
        message="Não foi possível sincronizar os dados. Verifique sua conexão e tente novamente."
        actionLabel="Tentar novamente"
        onAction={() => void journey.refetch()}
      />
    );
  if (!journey.data)
    return (
      <ErrorState
        title="Jornada não encontrada."
        message="Ela pode ter sido removida ou não pertence a esta conta."
        actionLabel="Voltar para Jornadas"
        onAction={() => router.replace("/journeys")}
      />
    );

  const j = journey.data;
  const canonicalMission = getTodayMission(mission.data);
  const current = canonicalMission?.journeyId === j.id ? canonicalMission : null;
  const isProgram = Boolean(j.sourcePackId && program.data);
  const programMission = Boolean(
    program.data?.currentStep &&
      current?.sourceType === "journey_action" &&
      current.sourceId === program.data.currentStep.id,
  );
  const target = current ? getMissionExecutionTarget(current) : null;
  const recent = (momentum.data?.recentEvents ?? []).filter((event) => event.journeyId === j.id);
  const recentPoints = recent.reduce((sum, event) => sum + event.points, 0);
  const daysRunning = dayDiff(j.startDate);
  const remaining = targetDiff(j.targetDate);

  async function completeMission() {
    if (!current || completionGuard.current) return;
    completionGuard.current = true;
    try {
      await mutations.completeMission.mutateAsync(current.id);
    } finally {
      completionGuard.current = false;
    }
  }

  function openAssistant(mode: "review" | "replan") {
    const step = program.data?.currentStep;
    const context =
      mode === "review"
        ? `Revise a direção desta Jornada usando apenas o estado real fornecido. Identifique se o próximo movimento está coerente com o objetivo, prazo e ritmo. Não invente progresso.\nJornada: ${j.title.slice(0, 160)}\nObjetivo: ${j.objective.slice(0, 500)}\nStatus: ${j.status}\nInício: ${j.startDate}\nPrazo: ${j.targetDate ?? "não definido"}\nMissão real de hoje: ${current?.title.slice(0, 240) ?? "nenhuma"}\nEtapa persistida: ${step?.title.slice(0, 240) ?? "nenhuma"}.`
        : `Ajude a replanejar o próximo marco verificável desta Jornada. Preserve o objetivo principal e proponha no máximo 3 movimentos concretos. Não diga que alterou o sistema sem uma ação confirmada.\nJornada: ${j.title.slice(0, 160)}\nObjetivo: ${j.objective.slice(0, 500)}\nPrazo: ${j.targetDate ?? "não definido"}\nMissão atual: ${current?.title.slice(0, 240) ?? "nenhuma"}\nEtapa atual: ${step?.title.slice(0, 240) ?? "nenhuma"}.`;
    router.push({ pathname: "/assistant", params: { context } });
  }

  return (
    <AppScreen scroll contentContainerStyle={s.page}>
      <Pressable accessibilityRole="button" onPress={() => router.back()}>
        <Text style={s.back}>{c.back}</Text>
      </Pressable>

      <View style={s.hero}>
        <View style={s.heroTop}>
          <Text style={s.eyebrow}>{c.evolution}</Text>
          <Text style={s.statusPill}>{journeyStatusLabel(j.status)}</Text>
        </View>
        <Text style={s.category}>{j.category.toUpperCase()}</Text>
        <Text style={s.title}>{j.title}</Text>
        <Text style={s.heroObjective}>{j.objective}</Text>
        <View style={s.timelineMetrics}>
          <MiniMetric value={daysRunning} label={c.daysActive} />
          <MiniMetric
            value={remaining === null ? "—" : Math.abs(remaining)}
            label={
              remaining === null ? c.noTarget : remaining < 0 ? c.overdue : c.daysLeft
            }
            danger={remaining !== null && remaining < 0}
          />
        </View>
      </View>

      <Block title={c.objective}>
        <Text style={s.body}>{j.objective}</Text>
        <View style={s.factRow}>
          <Fact
            label={c.started}
            value={new Date(`${j.startDate}T12:00:00`).toLocaleDateString(locale)}
          />
          <Fact
            label={c.target}
            value={
              j.targetDate
                ? new Date(`${j.targetDate}T12:00:00`).toLocaleDateString(locale)
                : c.noTarget
            }
          />
        </View>
      </Block>

      <Block title={c.checkpoint} accent>
        {current ? (
          <>
            <Text style={s.checkpointMeta}>
              {getMissionSourceLabel(current)} · {missionReason(current)}
            </Text>
            <Text style={s.checkpointTitle}>{current.title}</Text>
            {current.description ? <Text style={s.muted}>{current.description}</Text> : null}
            {current.momentumValue > 0 ? (
              <Text style={s.reward}>+{current.momentumValue} Momentum</Text>
            ) : null}
            {target ? (
              <Pressable style={s.button} onPress={() => router.push(target.href)}>
                <Text style={s.buttonText}>{target.label}</Text>
              </Pressable>
            ) : null}
            {current.sourceType === "journey_action" && !isProgram ? (
              <Pressable
                disabled={mutations.completeMission.isPending}
                onPress={() => void completeMission()}
                style={s.inlineAction}
              >
                <Text style={s.link}>{c.confirmStage}</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <Text style={s.checkpointTitle}>{c.noCheckpoint}</Text>
            <Text style={s.muted}>{c.noCheckpointCopy}</Text>
            <Pressable onPress={() => openAssistant("replan")} style={s.outlineButton}>
              <Text style={s.outlineText}>✦ {c.planAction}</Text>
            </Pressable>
          </>
        )}
      </Block>

      {j.sourcePackId && program.isPending ? <Text style={s.muted}>{c.programLoading}</Text> : null}
      {j.sourcePackId && program.isError ? (
        <View style={s.inlineError}>
          <Text style={s.error}>{c.programError}</Text>
          <Pressable onPress={() => void program.refetch()}>
            <Text style={s.link}>{c.retry}</Text>
          </Pressable>
        </View>
      ) : null}

      {isProgram ? (
        <ProgramWorkspace
          copyText={c}
          program={program.data!}
          hasMission={programMission}
          pending={mutations.completeMission.isPending}
          onComplete={() => void completeMission()}
          onPlan={() => openAssistant("replan")}
        />
      ) : null}

      <Block title={c.verified}>
        <Text style={s.muted}>{c.verifiedCopy}</Text>
        {recent.length ? (
          <>
            <View style={s.signalSummary}>
              <Text style={s.signalValue}>+{recentPoints}</Text>
              <Text style={s.signalLabel}>Momentum · {recent.length} sinais recentes</Text>
            </View>
            {recent.map((event) => (
              <View key={event.id} style={s.eventRow}>
                <View style={s.eventDot} />
                <Text style={s.eventText}>
                  +{event.points} Momentum · {new Date(event.createdAt).toLocaleDateString(locale)}
                </Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={s.body}>{c.noSignals}</Text>
        )}
        <View style={s.systemMomentum}>
          <Text style={s.meta}>{c.systemMomentum}</Text>
          <Text style={s.systemMomentumValue}>{momentum.data?.weekPoints ?? 0}</Text>
          <Text style={s.muted}>
            {c.week} · {momentum.data?.streak ?? 0} {c.streak}
          </Text>
        </View>
      </Block>

      <Block title={c.intelligence}>
        <Text style={s.muted}>{c.intelligenceCopy}</Text>
        <Pressable onPress={() => openAssistant("review")} style={s.aiPrimary}>
          <Text style={s.buttonText}>✦ {c.review}</Text>
        </Pressable>
        <Pressable onPress={() => openAssistant("replan")} style={s.outlineButton}>
          <Text style={s.outlineText}>{c.replan}</Text>
        </Pressable>
      </Block>

      <Block title={c.connected}>
        <Text style={s.muted}>{c.connectedCopy}</Text>
        <View style={s.connectionRow}>
          <Connection label="Tasks" />
          <Connection label="Projects" />
          <Connection label="Studies" />
          <Connection label="KIVRYN Core" />
        </View>
      </Block>

      <View style={s.stateActions}>
        {j.status === "active" ? (
          <Pressable
            disabled={mutations.status.isPending}
            onPress={() => mutations.status.mutate({ id: j.id, status: "paused" })}
            style={s.stateButton}
          >
            <Text style={s.stateButtonText}>{c.pause}</Text>
          </Pressable>
        ) : j.status === "paused" ? (
          <Pressable
            disabled={mutations.status.isPending}
            onPress={() => mutations.status.mutate({ id: j.id, status: "active" })}
            style={s.stateButton}
          >
            <Text style={s.stateButtonText}>{c.resume}</Text>
          </Pressable>
        ) : null}
        {(!isProgram || program.data?.completedSteps === program.data?.totalSteps) &&
        j.status !== "completed" &&
        j.status !== "archived" ? (
          <Pressable
            disabled={mutations.status.isPending}
            onPress={() => mutations.status.mutate({ id: j.id, status: "completed" })}
            style={s.completeButton}
          >
            <Text style={s.completeButtonText}>{c.complete}</Text>
          </Pressable>
        ) : null}
      </View>
      {mutations.status.error ? <Text style={s.error}>{c.statusError}</Text> : null}
    </AppScreen>
  );
}

function ProgramWorkspace({
  copyText,
  program,
  hasMission,
  pending,
  onComplete,
  onPlan,
}: {
  copyText: (typeof copy)["pt-BR"] | (typeof copy)["en-US"];
  program: JourneyProgramState;
  hasMission: boolean;
  pending: boolean;
  onComplete(): void;
  onPlan(): void;
}) {
  const percent = Math.round(program.progressRatio * 100);
  const done = program.completedSteps === program.totalSteps;
  return (
    <>
      <View style={s.programHero}>
        <Text style={s.eyebrow}>{done ? copyText.programDone : copyText.programRunning}</Text>
        <View style={s.programProgressTop}>
          <Text style={s.programProgressValue}>{percent}%</Text>
          <Text style={s.muted}>
            {program.completedSteps} / {program.totalSteps} {copyText.stagesDone}
          </Text>
        </View>
        <View style={s.track}>
          <View style={[s.fill, { width: `${percent}%` }]} />
        </View>
      </View>

      {program.currentStep ? (
        <View style={s.stageCard}>
          <Text style={s.eyebrow}>{copyText.nextStage}</Text>
          <Text style={s.phase}>
            {program.currentStep.sequence} · {program.currentStep.phase.toUpperCase()}
          </Text>
          <Text style={s.stageTitle}>{program.currentStep.title}</Text>
          <Text style={s.body}>{program.currentStep.description}</Text>
          {hasMission ? (
            <>
              <Text style={s.currentMission}>{copyText.currentMission}</Text>
              <Pressable disabled={pending} onPress={onComplete} style={s.button}>
                <Text style={s.buttonText}>
                  {pending ? copyText.confirming : copyText.confirmStage}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={s.muted}>{copyText.noMissionForStage}</Text>
          )}
          <Pressable onPress={onPlan} style={s.outlineButton}>
            <Text style={s.outlineText}>✦ {copyText.replan}</Text>
          </Pressable>
        </View>
      ) : null}

      <Block title={copyText.programMap}>
        {program.steps.map((step, index) => (
          <View key={step.id} style={s.roadmapRow}>
            <View style={s.roadmapRail}>
              <View
                style={[
                  s.roadmapDot,
                  step.status === "completed" && s.roadmapDotDone,
                  step.status === "current" && s.roadmapDotCurrent,
                ]}
              />
              {index < program.steps.length - 1 ? <View style={s.roadmapLine} /> : null}
            </View>
            <View style={[s.roadmapBody, step.status === "current" && s.roadmapCurrent]}>
              <Text style={s.phase}>
                {step.sequence} · {step.phase.toUpperCase()}
              </Text>
              <Text style={s.body}>{step.title}</Text>
              <Text style={step.status === "current" ? s.eyebrow : s.muted}>
                {step.status === "completed"
                  ? copyText.done
                  : step.status === "current"
                    ? copyText.now
                    : copyText.next}
              </Text>
            </View>
          </View>
        ))}
      </Block>
    </>
  );
}

function MiniMetric({
  value,
  label,
  danger,
}: {
  value: number | string;
  label: string;
  danger?: boolean;
}) {
  return (
    <View style={s.miniMetric}>
      <Text style={[s.miniMetricValue, danger && s.danger]}>{value}</Text>
      <Text style={s.miniMetricLabel}>{label}</Text>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.fact}>
      <Text style={s.meta}>{label}</Text>
      <Text style={s.factValue}>{value}</Text>
    </View>
  );
}

function Connection({ label }: { label: string }) {
  return (
    <View style={s.connectionPill}>
      <View style={s.connectionDot} />
      <Text style={s.connectionText}>{label}</Text>
    </View>
  );
}

function Block({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <View style={[s.block, accent && s.blockAccent]}>
      <Text style={s.eyebrow}>{title}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  page: { gap: spacing.lg, paddingBottom: spacing.xxl },
  back: { ...typography.label, color: colors.textMuted },
  hero: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  category: { ...typography.caption, color: colors.textMuted },
  statusPill: {
    ...typography.caption,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.accentMuted,
  },
  title: { ...typography.display, color: colors.text },
  heroObjective: { ...typography.body, color: colors.textMuted, lineHeight: 24 },
  timelineMetrics: { flexDirection: "row", gap: spacing.sm },
  miniMetric: {
    flex: 1,
    minHeight: 78,
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  miniMetricValue: { ...typography.title, color: colors.text },
  miniMetricLabel: { ...typography.caption, color: colors.textMuted },
  danger: { color: colors.danger },
  block: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  blockAccent: { borderLeftWidth: 3, borderLeftColor: colors.primaryBright },
  body: { ...typography.body, color: colors.text },
  muted: { ...typography.body, color: colors.textMuted },
  meta: { ...typography.caption, color: colors.textMuted },
  factRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  fact: { flex: 1, gap: 2 },
  factValue: { ...typography.label, color: colors.text },
  checkpointMeta: { ...typography.caption, color: colors.primaryBright },
  checkpointTitle: { ...typography.heading, color: colors.text },
  reward: { ...typography.label, color: colors.primaryBright },
  button: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  buttonText: { ...typography.label, color: colors.text },
  inlineAction: { alignSelf: "flex-start" },
  link: { ...typography.label, color: colors.primaryBright, paddingVertical: spacing.xs },
  outlineButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryBright,
  },
  outlineText: { ...typography.label, color: colors.primaryBright },
  inlineError: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
  },
  error: { ...typography.body, color: colors.danger, textAlign: "center" },
  signalSummary: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  signalValue: { ...typography.title, color: colors.primaryBright },
  signalLabel: { ...typography.caption, color: colors.textMuted },
  eventRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  eventDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primaryBright },
  eventText: { ...typography.body, color: colors.textMuted },
  systemMomentum: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  systemMomentumValue: { ...typography.title, color: colors.text },
  aiPrimary: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  connectionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  connectionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  connectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryBright },
  connectionText: { ...typography.caption, color: colors.text },
  programHero: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  programProgressTop: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: spacing.sm },
  programProgressValue: { ...typography.display, color: colors.primaryBright },
  track: {
    height: 8,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  fill: { height: "100%", backgroundColor: colors.primaryBright },
  stageCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primaryBright,
    backgroundColor: colors.surface,
  },
  phase: { ...typography.caption, color: colors.primaryBright },
  stageTitle: { ...typography.heading, color: colors.text },
  currentMission: { ...typography.eyebrow, color: colors.text },
  roadmapRow: { flexDirection: "row", alignItems: "stretch", gap: spacing.sm },
  roadmapRail: { width: 18, alignItems: "center" },
  roadmapDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: colors.textMuted },
  roadmapDotDone: { borderColor: colors.success, backgroundColor: colors.success },
  roadmapDotCurrent: { borderColor: colors.primaryBright, backgroundColor: colors.primaryBright },
  roadmapLine: { flex: 1, width: 1, minHeight: 44, backgroundColor: colors.border },
  roadmapBody: { flex: 1, gap: 4, paddingBottom: spacing.md },
  roadmapCurrent: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  stateActions: { gap: spacing.sm },
  stateButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stateButtonText: { ...typography.label, color: colors.textMuted },
  completeButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.success,
  },
  completeButtonText: { ...typography.label, color: colors.success },
});