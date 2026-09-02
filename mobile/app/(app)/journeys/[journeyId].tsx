import { router, useLocalSearchParams } from "expo-router";
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
  getMissionSourceLabel,
  type JourneyProgramState,
} from "@/lib/journeys";
export default function JourneyDetail() {
  const { journeyId } = useLocalSearchParams<{ journeyId: string }>(),
    journey = useJourney(journeyId ?? ""),
    mission = useDailyMission(),
    momentum = useMomentum(),
    program = useJourneyProgram(journeyId ?? "", journey.data?.sourcePackId),
    mutations = useJourneyMutations();
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
  const j = journey.data,
    current = mission.data?.journeyId === j.id ? mission.data : null,
    isProgram = Boolean(j.sourcePackId && program.data),
    programMission = Boolean(
      program.data?.currentStep &&
      current?.sourceType === "journey_action" &&
      current.sourceId === program.data.currentStep.id,
    );
  const target = current ? getMissionExecutionTarget(current) : null;
  const recent = (momentum.data?.recentEvents ?? []).filter((event) => event.journeyId === j.id);
  return (
    <AppScreen scroll contentContainerStyle={s.page}>
      <Text style={s.eyebrow}>{j.category.toUpperCase()}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.back()}>
        <Text style={s.back}>‹ Voltar para Jornadas</Text>
      </Pressable>
      <Text style={s.title}>{j.title}</Text>
      <Text style={s.muted}>
        {j.status === "active" ? "Em andamento" : j.status === "paused" ? "Pausada" : "Concluída"}
      </Text>
      <Block title="OBJETIVO">
        <Text style={s.body}>{j.objective}</Text>
        {j.targetDate ? (
          <Text style={s.muted}>
            Data-alvo: {new Date(`${j.targetDate}T12:00:00`).toLocaleDateString("pt-BR")}
          </Text>
        ) : null}
      </Block>
      {j.sourcePackId && program.isPending ? (
        <Text style={s.muted}>Carregando plano do programa…</Text>
      ) : null}
      {j.sourcePackId && program.isError ? (
        <View style={s.inlineError}>
          <Text style={s.error}>Não foi possível carregar o plano do programa.</Text>
          <Pressable onPress={() => void program.refetch()}>
            <Text style={s.link}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : null}
      {isProgram ? (
        <ProgramWorkspace
          program={program.data!}
          hasMission={programMission}
          pending={mutations.completeMission.isPending}
          onComplete={() => current && mutations.completeMission.mutate(current.id)}
          onPlan={() => openAssistant(j, program.data!)}
        />
      ) : !j.sourcePackId || (!program.isPending && !program.isError) ? (
        <Block title="AGORA">
          <Text style={s.body}>
            {current?.title ?? "Defina uma próxima ação para avançar esta Jornada."}
          </Text>
          {current ? (
            <Text style={s.muted}>
              {getMissionSourceLabel(current)}
              {current.description ? ` · ${current.description}` : ""}
            </Text>
          ) : null}
          {current && target ? (
            <Pressable style={s.button} onPress={() => router.push(target.href)}>
              <Text style={s.buttonText}>{target.label}</Text>
            </Pressable>
          ) : null}
          {current?.sourceType === "journey_action" ? (
            <Pressable
              disabled={mutations.completeMission.isPending}
              onPress={() => mutations.completeMission.mutate(current.id)}
            >
              <Text style={s.link}>Confirmar ação concluída</Text>
            </Pressable>
          ) : null}
          <Pressable style={s.outlineButton} onPress={() => openAssistant(j)}>
            <Text style={s.outlineText}>Planejar com a NEXORA</Text>
          </Pressable>
        </Block>
      ) : null}
      <Block title="PROGRESSO RECENTE">
        <Text style={s.metric}>{momentum.data?.weekPoints ?? 0}</Text>
        <Text style={s.muted}>
          Momentum verificado nesta semana · {momentum.data?.completedMissions ?? 0} missões
          concluídas.
        </Text>
      </Block>
      {recent.length ? (
        <Block title="ATIVIDADE RECENTE">
          {recent.map((event) => (
            <Text key={event.id} style={s.muted}>
              +{event.points} Momentum · {new Date(event.createdAt).toLocaleDateString("pt-BR")}
            </Text>
          ))}
        </Block>
      ) : null}
      {j.status === "active" ? (
        <Pressable
          disabled={mutations.status.isPending}
          onPress={() => mutations.status.mutate({ id: j.id, status: "paused" })}
        >
          <Text style={s.link}>Pausar Jornada</Text>
        </Pressable>
      ) : j.status === "paused" ? (
        <Pressable
          disabled={mutations.status.isPending}
          onPress={() => mutations.status.mutate({ id: j.id, status: "active" })}
        >
          <Text style={s.link}>Ativar Jornada</Text>
        </Pressable>
      ) : null}
      {(!isProgram || program.data?.completedSteps === program.data?.totalSteps) &&
      j.status !== "completed" &&
      j.status !== "archived" ? (
        <Pressable
          disabled={mutations.status.isPending}
          onPress={() => mutations.status.mutate({ id: j.id, status: "completed" })}
        >
          <Text style={s.link}>Concluir Jornada</Text>
        </Pressable>
      ) : null}
      {mutations.status.error ? (
        <Text style={s.error}>{mutations.status.error.message}</Text>
      ) : null}
    </AppScreen>
  );
}
function openAssistant(
  journey: { title: string; objective: string },
  program?: JourneyProgramState,
) {
  const step = program?.currentStep;
  const context = program
    ? `Planeje esta etapa da Jornada.\nTítulo: ${journey.title.slice(0, 160)}\nObjetivo: ${journey.objective.slice(0, 500)}\nEtapa: ${step?.title.slice(0, 240)}\nDescrição: ${step?.description.slice(0, 500)}\nFase: ${step?.phase.slice(0, 80)}\nProgresso: ${program.completedSteps} de ${program.totalSteps}.\nPara alterações, preserve PREVIEW → CONFIRMAR → APLICAR.`
    : `Ajude a definir uma próxima ação.\nTítulo: ${journey.title.slice(0, 160)}\nObjetivo: ${journey.objective.slice(0, 500)}\nPara alterações, preserve PREVIEW → CONFIRMAR → APLICAR.`;
  router.push({ pathname: "/assistant", params: { context } });
}
function ProgramWorkspace({
  program,
  hasMission,
  pending,
  onComplete,
  onPlan,
}: {
  program: JourneyProgramState;
  hasMission: boolean;
  pending: boolean;
  onComplete(): void;
  onPlan(): void;
}) {
  const percent = Math.round(program.progressRatio * 100),
    done = program.completedSteps === program.totalSteps;
  return (
    <>
      <View style={s.progressCard}>
        <Text style={s.eyebrow}>{done ? "PROGRAMA CONCLUÍDO" : "PROGRAMA EM ANDAMENTO"}</Text>
        <Text style={s.metric}>
          {program.completedSteps} de {program.totalSteps} etapas concluídas
        </Text>
        <Text style={s.percent}>{percent}%</Text>
        <View style={s.track}>
          <View style={[s.fill, { width: `${percent}%` }]} />
        </View>
        {done ? <Text style={s.body}>Você concluiu todas as etapas deste programa.</Text> : null}
      </View>
      {program.currentStep ? (
        <View style={s.currentCard}>
          <Text style={s.eyebrow}>AGORA</Text>
          <Text style={s.phase}>
            ETAPA {program.currentStep.sequence} · {program.currentStep.phase.toUpperCase()}
          </Text>
          <Text style={s.stepTitle}>{program.currentStep.title}</Text>
          <Text style={s.body}>{program.currentStep.description}</Text>
          {hasMission ? (
            <>
              <Text style={s.mission}>MISSÃO DE HOJE</Text>
              <Pressable style={s.button} disabled={pending} onPress={onComplete}>
                <Text style={s.buttonText}>
                  {pending ? "Confirmando…" : "Confirmar etapa concluída"}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={s.muted}>Esta é a próxima etapa do seu programa.</Text>
          )}
          <Pressable style={s.outlineButton} onPress={onPlan}>
            <Text style={s.outlineText}>Planejar com a NEXORA</Text>
          </Pressable>
        </View>
      ) : null}
      <Block title="PLANO DO PROGRAMA">
        {program.steps.map((step) => (
          <View key={step.id} style={[s.roadmap, step.status === "current" && s.roadmapCurrent]}>
            <Text style={s.marker}>
              {step.status === "completed" ? "✓" : step.status === "current" ? "●" : "○"}
            </Text>
            <View style={s.grow}>
              <Text style={s.phase}>
                {step.sequence} · {step.phase.toUpperCase()}
              </Text>
              <Text style={s.body}>{step.title}</Text>
              <Text style={step.status === "current" ? s.eyebrow : s.muted}>
                {step.status === "completed"
                  ? "Concluída"
                  : step.status === "current"
                    ? "Agora"
                    : "Próxima"}
              </Text>
            </View>
          </View>
        ))}
      </Block>
    </>
  );
}
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.block}>
      <Text style={s.eyebrow}>{title}</Text>
      {children}
    </View>
  );
}
const s = StyleSheet.create({
  page: { gap: spacing.lg, paddingBottom: spacing.xxl },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  title: { ...typography.display, color: colors.text },
  block: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  body: { ...typography.body, color: colors.text },
  progressCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  currentCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primaryBright,
    backgroundColor: colors.surface,
  },
  inlineError: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
  },
  percent: { ...typography.heading, color: colors.primaryBright },
  track: {
    height: 8,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  fill: { height: "100%", backgroundColor: colors.primaryBright },
  phase: { ...typography.caption, color: colors.primaryBright },
  stepTitle: { ...typography.heading, color: colors.text },
  mission: { ...typography.eyebrow, color: colors.text },
  roadmap: { flexDirection: "row", gap: spacing.md, padding: spacing.sm, borderRadius: radius.md },
  roadmapCurrent: { backgroundColor: colors.surfaceRaised },
  marker: { ...typography.heading, color: colors.primaryBright },
  grow: { flex: 1, gap: spacing.xs },
  outlineButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryBright,
  },
  outlineText: { ...typography.label, color: colors.primaryBright },
  muted: { ...typography.body, color: colors.textMuted },
  metric: { ...typography.title, color: colors.text },
  button: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  buttonText: { ...typography.label, color: colors.text },
  link: {
    ...typography.label,
    color: colors.primaryBright,
    textAlign: "center",
    padding: spacing.md,
  },
  back: { ...typography.label, color: colors.textMuted },
  error: { ...typography.body, color: colors.danger, textAlign: "center" },
});
