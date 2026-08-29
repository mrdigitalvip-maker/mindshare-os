import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/components/app-screen";
import { ErrorState, LoadingState } from "@/components/screen-state";
import {
  useDailyMission,
  useJourney,
  useJourneyMutations,
  useMomentum,
} from "@/hooks/use-journeys";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { getMissionExecutionTarget, getMissionSourceLabel } from "@/lib/journeys";
export default function JourneyDetail() {
  const { journeyId } = useLocalSearchParams<{ journeyId: string }>(),
    journey = useJourney(journeyId ?? ""),
    mission = useDailyMission(),
    momentum = useMomentum(),
    mutations = useJourneyMutations();
  if (journey.isPending) return <LoadingState title="Carregando Jornada…" />;
  if (journey.isError || !journey.data)
    return (
      <ErrorState
        title="Jornada indisponível."
        message="Não foi possível sincronizar os dados."
        actionLabel="Tentar novamente"
        onAction={() => void journey.refetch()}
      />
    );
  const j = journey.data,
    current = mission.data?.journeyId === j.id ? mission.data : null;
  const target = current ? getMissionExecutionTarget(current) : null;
  const recent = (momentum.data?.recentEvents ?? []).filter((event) => event.journeyId === j.id);
  return (
    <AppScreen scroll contentContainerStyle={s.page}>
      <Text style={s.eyebrow}>{j.category.toUpperCase()}</Text>
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
      <Block title="AGORA">
        <Text style={s.body}>
          {current?.title ?? "Defina uma próxima ação real para continuar."}
        </Text>
        {current ? (
          <Text style={s.muted}>
            {getMissionSourceLabel(current)}
            {current.description ? ` · ${current.description}` : ""}
          </Text>
        ) : null}
        {current && target ? (
          <Pressable
            style={s.button}
            accessibilityRole="button"
            onPress={() => router.push(target.href)}
          >
            <Text style={s.buttonText}>{target.label}</Text>
          </Pressable>
        ) : null}
        {current?.sourceType === "journey_action" ? (
          <Pressable
            disabled={mutations.completeMission.isPending}
            accessibilityRole="button"
            onPress={() => mutations.completeMission.mutate(current.id)}
          >
            <Text style={s.link}>Confirmar ação concluída</Text>
          </Pressable>
        ) : null}
      </Block>
      <Block title="PROGRESSO RECENTE">
        <Text style={s.metric}>{momentum.data?.weekPoints ?? 0}</Text>
        <Text style={s.muted}>
          Momentum verificado nesta semana · {momentum.data?.completedMissions ?? 0} missões
          concluídas.
        </Text>
      </Block>
      <Block title="PLANO">
        <Text style={s.muted}>
          {current
            ? `${current.sourceType}: ${current.title}`
            : "Nenhum trabalho relacionado hoje."}
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
      <Pressable
        style={s.button}
        onPress={() =>
          router.push({
            pathname: "/assistant",
            params: {
              context: `Ajude com esta Jornada.\nTítulo: ${j.title.slice(0, 160)}\nObjetivo: ${j.objective.slice(0, 500)}\nCategoria: ${j.category}\nPróxima missão: ${(current?.title ?? "nenhuma").slice(0, 240)}\nNão altere dados sem apresentar uma prévia e pedir confirmação.`,
            },
          })
        }
      >
        <Text style={s.buttonText}>Ajudar com esta Jornada</Text>
      </Pressable>
      {j.status === "active" ? (
        <Pressable
          disabled={mutations.status.isPending}
          onPress={() => mutations.status.mutate({ id: j.id, status: "paused" })}
        >
          <Text style={s.link}>Pausar Jornada</Text>
        </Pressable>
      ) : (
        <Pressable
          disabled={mutations.status.isPending}
          onPress={() => mutations.status.mutate({ id: j.id, status: "active" })}
        >
          <Text style={s.link}>Ativar Jornada</Text>
        </Pressable>
      )}
    </AppScreen>
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
});
