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
  type JourneyCategory,
} from "@/lib/journeys";
import { isPremiumEntitlement } from "@/lib/subscription";
import { colors, radius, spacing, typography } from "@/lib/theme";
export default function Journeys() {
  const journeys = useJourneys(),
    mission = useDailyMission(),
    momentum = useMomentum(),
    challenge = useJourneyChallenge(),
    subscription = useSubscription(),
    mutations = useJourneyMutations();
  const [modal, setModal] = useState(false),
    [title, setTitle] = useState(""),
    [objective, setObjective] = useState(""),
    [date, setDate] = useState<string | null>(null),
    [category, setCategory] = useState<JourneyCategory>("custom");
  const [refreshing, setRefreshing] = useState(false);
  const saving = useRef(false);
  const active = useMemo(
    () => journeys.data?.filter((j) => j.status === "active") ?? [],
    [journeys.data],
  );
  const primaryJourney = getActiveJourney(journeys.data ?? []);
  const otherJourneys = (journeys.data ?? []).filter((item) => item.id !== primaryJourney?.id);
  const todayMission = getTodayMission(mission.data);
  const missionTarget = todayMission ? getMissionExecutionTarget(todayMission) : null;
  const premium = isPremiumEntitlement(subscription.data?.entitlement ?? "free"),
    limit = PLAN_LIMITS[premium ? "premium" : "free"].activeJourneys;
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
    if (limit !== null && active.length >= limit) return;
    saving.current = true;
    try {
      await mutations.create.mutateAsync({ title, objective, category, targetDate: date });
      setModal(false);
      setTitle("");
      setObjective("");
      setDate(null);
    } finally {
      saving.current = false;
    }
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
          title="Jornadas"
          action={
            <Pressable
              onPress={() => setModal(true)}
              disabled={limit !== null && active.length >= limit}
            >
              <Text style={s.link}>Nova jornada</Text>
            </Pressable>
          }
        />
        <Text style={s.promise}>Seu objetivo, uma próxima ação real e progresso verificável.</Text>
        {limit !== null && active.length >= limit ? (
          <View style={s.limitNotice}>
            <Text style={s.cardTitle}>Seu plano Free permite uma Jornada ativa.</Text>
            <Text style={s.muted}>
              Pause ou conclua a Jornada atual antes de criar ou reativar outra.
            </Text>
          </View>
        ) : null}
        <Pressable accessibilityRole="button" style={s.card} onPress={() => router.push("/packs")}>
          <Text style={s.meta}>JOURNEY PACKS</Text>
          <Text style={s.cardTitle}>Comece com um programa guiado</Text>
          <Text style={s.muted}>
            Escolha um resultado e revise a estrutura antes de criar sua Jornada.
          </Text>
          <Text style={s.link}>Explorar programas ›</Text>
        </Pressable>
        <Section title="MISSÃO DE HOJE">
          {mission.isPending ? (
            <View style={s.card}>
              <Text style={s.muted}>Buscando sua missão…</Text>
            </View>
          ) : mission.isError ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>Não foi possível atualizar a missão de hoje.</Text>
              <Text style={s.muted}>Suas Jornadas continuam disponíveis.</Text>
              {__DEV__ ? <Text style={s.diagnostic}>{String(mission.error)}</Text> : null}
              <Pressable accessibilityRole="button" onPress={() => void mission.refetch()}>
                <Text style={s.link}>Tentar novamente</Text>
              </Pressable>
            </View>
          ) : todayMission ? (
            <View style={s.hero}>
              <Text style={s.meta}>
                {getMissionSourceLabel(todayMission)} · {missionReason(todayMission)}
              </Text>
              <Text style={s.heroTitle}>{todayMission.title}</Text>
              {todayMission.description ? (
                <>
                  <Text style={s.meta}>Próxima ação</Text>
                  <Text style={s.body}>{todayMission.description}</Text>
                </>
              ) : null}
              {todayMission.momentumValue > 0 ? (
                <Text style={s.reward}>
                  +{todayMission.momentumValue} Momentum após conclusão verificada
                </Text>
              ) : null}
              {missionTarget ? (
                <Pressable
                  style={s.button}
                  accessibilityRole="button"
                  accessibilityLabel={`${missionTarget.label}: ${todayMission.title}`}
                  onPress={() => router.push(missionTarget.href)}
                >
                  <Text style={s.buttonText}>{missionTarget.label}</Text>
                </Pressable>
              ) : (
                <Text style={s.muted}>A fonte desta ação não está mais disponível.</Text>
              )}
            </View>
          ) : (
            <View style={s.card}>
              <Text style={s.cardTitle}>
                {active.length
                  ? "Defina uma próxima ação para continuar."
                  : "Sua primeira missão começa com um objetivo."}
              </Text>
              <Text style={s.muted}>
                {active.length
                  ? "Adicione uma ação real a uma tarefa ou estudo ativo. A NEXORA não inventa trabalho para preencher esta tela."
                  : "Crie sua primeira Jornada para organizar o que você quer alcançar."}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => (active.length ? router.push("/productivity") : setModal(true))}
              >
                <Text style={s.link}>
                  {active.length ? "Definir próxima ação" : "Criar minha primeira Jornada"}
                </Text>
              </Pressable>
            </View>
          )}
        </Section>
        <Section title="SEU RITMO">
          <View style={s.card}>
            {momentum.isError ? (
              <>
                <Text style={s.cardTitle}>Seu ritmo está temporariamente indisponível.</Text>
                <Pressable onPress={() => void momentum.refetch()}>
                  <Text style={s.link}>Tentar novamente</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={s.metric}>
                  {momentum.data?.totalPoints ?? 0} <Text style={s.metricLabel}>Momentum</Text>
                </Text>
                <Text style={s.muted}>Construído por execuções verificadas.</Text>
              </>
            )}
          </View>
        </Section>
        <Section title="JORNADA ATIVA">
          {primaryJourney ? (
            <Pressable
              accessibilityRole="button"
              key={primaryJourney.id}
              style={s.card}
              onPress={() => router.push(`/journeys/${primaryJourney.id}`)}
            >
              <Text style={s.meta}>{primaryJourney.category.toUpperCase()} · EM ANDAMENTO</Text>
              <Text style={s.cardTitle}>{primaryJourney.title}</Text>
              <Text numberOfLines={3} style={s.muted}>
                {primaryJourney.objective}
              </Text>
              <Text style={s.link}>Continuar ›</Text>
            </Pressable>
          ) : (
            <View style={s.card}>
              <Text style={s.cardTitle}>
                Transforme uma meta em um plano que avança todos os dias.
              </Text>
              <Pressable accessibilityRole="button" onPress={() => setModal(true)}>
                <Text style={s.link}>Criar minha primeira Jornada</Text>
              </Pressable>
            </View>
          )}
        </Section>
        {challenge.data ? (
          <Section title="DESAFIO ATUAL">
            <View style={s.card}>
              <Text style={s.cardTitle}>{challenge.data.title}</Text>
              <Text style={s.muted}>
                {getChallengeProgress(challenge.data).progress} /{" "}
                {getChallengeProgress(challenge.data).target} ·{" "}
                {new Date(challenge.data.startsAt).toLocaleDateString("pt-BR")}–
                {new Date(challenge.data.endsAt).toLocaleDateString("pt-BR")}
              </Text>
              <View style={s.track}>
                <View
                  style={[
                    s.fill,
                    {
                      width: `${getChallengeProgress(challenge.data).percentage}%`,
                    },
                  ]}
                />
              </View>
              <Text style={s.reward}>+{challenge.data.rewardPoints} Momentum</Text>
            </View>
          </Section>
        ) : null}
        {otherJourneys.length ? (
          <Section title="OUTRAS JORNADAS">
            {otherJourneys.map((j) => (
              <Pressable
                accessibilityRole="button"
                key={j.id}
                style={s.card}
                onPress={() => router.push(`/journeys/${j.id}`)}
              >
                <Text style={s.cardTitle}>{j.title}</Text>
                <Text style={s.meta}>{journeyStatusLabel(j.status).toUpperCase()}</Text>
              </Pressable>
            ))}
          </Section>
        ) : null}
        <Text style={s.privacy}>
          As Jornadas podem usar apenas os dados do seu espaço NEXORA para recomendar execução. Nada
          é publicado.
        </Text>
      </AppScreen>
      <NativeFormModal
        visible={modal}
        title="Nova jornada"
        value={title}
        placeholder="O que você quer alcançar?"
        secondaryValue={objective}
        secondaryPlaceholder="Qual resultado você quer alcançar?"
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
          {JOURNEY_TEMPLATES.map((t) => (
            <Pressable
              key={t.category}
              style={[s.chip, category === t.category && s.chipSelected]}
              onPress={() => setCategory(t.category)}
            >
              <Text style={s.chipText}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </NativeFormModal>
    </>
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
  promise: { ...typography.body, color: colors.textMuted },
  tabs: {
    flexDirection: "row",
    gap: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: { ...typography.label, color: colors.textMuted, paddingVertical: spacing.sm },
  tabActive: {
    ...typography.label,
    color: colors.primaryBright,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryBright,
  },
  section: { gap: spacing.sm },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  hero: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  heroTitle: { ...typography.title, color: colors.text },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardTitle: { ...typography.heading, color: colors.text },
  body: { ...typography.body, color: colors.text },
  muted: { ...typography.body, color: colors.textMuted },
  diagnostic: { ...typography.caption, color: colors.danger },
  meta: { ...typography.caption, color: colors.textMuted },
  reward: { ...typography.label, color: colors.primaryBright },
  link: { ...typography.label, color: colors.primaryBright, paddingVertical: spacing.sm },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  buttonText: { ...typography.label, color: colors.text },
  metric: { ...typography.title, color: colors.text },
  metricLabel: { ...typography.body, color: colors.textMuted },
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
    height: 6,
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
});
