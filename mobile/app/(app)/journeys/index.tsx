import { LocalizedCopy } from "@/components/localized-copy";
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
              <Text style={s.link}>
                <LocalizedCopy copyKey="legacy.22b0c0cd16d0" />
              </Text>
            </Pressable>
          }
        />

        <Text style={s.promise}>
          <LocalizedCopy copyKey="legacy.651703bbde39" />
        </Text>
        {limit !== null && active.length >= limit ? (
          <View style={s.limitNotice}>
            <Text style={s.cardTitle}>
              <LocalizedCopy copyKey="legacy.ef20fa6faa42" />
            </Text>
            <Text style={s.muted}>
              <LocalizedCopy copyKey="legacy.28b6f2d56999" />
            </Text>
          </View>
        ) : null}
        <Pressable accessibilityRole="button" style={s.card} onPress={() => router.push("/packs")}>
          <Text style={s.meta}>
            <LocalizedCopy copyKey="legacy.4dcc23f1cc1b" />
          </Text>
          <Text style={s.cardTitle}>
            <LocalizedCopy copyKey="legacy.f1263562aebf" />
          </Text>
          <Text style={s.muted}>
            <LocalizedCopy copyKey="legacy.8afd02847b39" />
          </Text>
          <Text style={s.link}>
            <LocalizedCopy copyKey="legacy.766344a86a8c" />
          </Text>
        </Pressable>
        <Section title="MISSÃO DE HOJE">
          {mission.isPending ? (
            <View style={s.card}>
              <Text style={s.muted}>
                <LocalizedCopy copyKey="legacy.353cb9527fc2" />
              </Text>
            </View>
          ) : mission.isError ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>
                <LocalizedCopy copyKey="legacy.4745f50a1cb8" />
              </Text>
              <Text style={s.muted}>
                <LocalizedCopy copyKey="legacy.2e478cac60e8" />
              </Text>
              {__DEV__ ? <Text style={s.diagnostic}>{String(mission.error)}</Text> : null}
              <Pressable accessibilityRole="button" onPress={() => void mission.refetch()}>
                <Text style={s.link}>
                  <LocalizedCopy copyKey="legacy.311c4d131d60" />
                </Text>
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
                  <Text style={s.meta}>
                    <LocalizedCopy copyKey="legacy.7385d9b322b7" />
                  </Text>
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
                <Text style={s.muted}>
                  <LocalizedCopy copyKey="legacy.e115de4e0e4c" />
                </Text>
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
                <Text style={s.cardTitle}>
                  <LocalizedCopy copyKey="legacy.8891364260dd" />
                </Text>
                <Pressable onPress={() => void momentum.refetch()}>
                  <Text style={s.link}>
                    <LocalizedCopy copyKey="legacy.311c4d131d60" />
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={s.metric}>
                  {momentum.data?.totalPoints ?? 0}{" "}
                  <Text style={s.metricLabel}>
                    <LocalizedCopy copyKey="legacy.7a21a88513a8" />
                  </Text>
                </Text>
                <Text style={s.muted}>
                  <LocalizedCopy copyKey="legacy.ff931bcb51a8" />
                </Text>
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
              <Text style={s.link}>
                <LocalizedCopy copyKey="legacy.08260253b90c" />
              </Text>
            </Pressable>
          ) : (
            <View style={s.card}>
              <Text style={s.cardTitle}>
                <LocalizedCopy copyKey="legacy.c17ded40d6db" />
              </Text>
              <Pressable accessibilityRole="button" onPress={() => setModal(true)}>
                <Text style={s.link}>
                  <LocalizedCopy copyKey="legacy.7b3068b0904f" />
                </Text>
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
              <Text style={s.reward}>
                +{challenge.data.rewardPoints}
                <LocalizedCopy copyKey="legacy.7a21a88513a8" />
              </Text>
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
          <LocalizedCopy copyKey="legacy.07773d3f549e" />
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
