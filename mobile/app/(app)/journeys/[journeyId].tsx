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
  return (
    <AppScreen scroll contentContainerStyle={s.page}>
      <Text style={s.eyebrow}>{j.category.toUpperCase()}</Text>
      <Text style={s.title}>{j.title}</Text>
      <Block title="OBJETIVO">
        <Text style={s.body}>{j.objective}</Text>
        {j.targetDate ? (
          <Text style={s.muted}>
            Data-alvo: {new Date(`${j.targetDate}T12:00:00`).toLocaleDateString("pt-BR")}
          </Text>
        ) : null}
      </Block>
      <Block title="MISSÃO ATUAL">
        <Text style={s.body}>{current?.title ?? "Nenhuma missão vinculada hoje."}</Text>
      </Block>
      <Block title="PROGRESSO RECENTE">
        <Text style={s.metric}>{momentum.data?.weekPoints ?? 0}</Text>
        <Text style={s.muted}>
          Momentum nesta semana. O progresso percentual só aparece quando houver ações com
          denominador real.
        </Text>
      </Block>
      <Block title="RELATED WORK">
        <Text style={s.muted}>
          {current
            ? `${current.sourceType}: ${current.title}`
            : "Nenhum trabalho relacionado hoje."}
        </Text>
      </Block>
      <Pressable
        style={s.button}
        onPress={() =>
          router.push({
            pathname: "/assistant",
            params: {
              context: `Jornada: ${j.title}\nObjetivo: ${j.objective}\nMissão atual: ${current?.title ?? "nenhuma"}`,
            },
          })
        }
      >
        <Text style={s.buttonText}>Pedir ajuda à NEXORA</Text>
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
