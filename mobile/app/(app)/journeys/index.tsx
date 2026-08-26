import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/components/app-screen";
import { NativeFormModal } from "@/components/native-form-modal";
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
import { JOURNEY_TEMPLATES, sourceHref, type JourneyCategory } from "@/lib/journeys";
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
    [date, setDate] = useState(""),
    [category, setCategory] = useState<JourneyCategory>("custom");
  const [refreshing, setRefreshing] = useState(false);
  const active = useMemo(
    () => journeys.data?.filter((j) => j.status === "active") ?? [],
    [journeys.data],
  );
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
    await mutations.create.mutateAsync({
      title,
      objective: objective || title,
      category,
      targetDate: date || null,
    });
    setModal(false);
    setTitle("");
    setObjective("");
  }
  if (journeys.isPending || mission.isPending)
    return <LoadingState title="Preparando suas Jornadas…" />;
  if (journeys.isError || mission.isError)
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
        <Text style={s.promise}>NEXORA transforma objetivos em execução diária.</Text>
        <View style={s.tabs}>
          <Text style={s.tabActive}>Hoje</Text>
          <Text style={s.tab}>Jornadas</Text>
          <Text style={s.tab}>Desafio</Text>
        </View>
        <Section title="SUA MISSÃO">
          {mission.data ? (
            <View style={s.hero}>
              <Text style={s.eyebrow}>MISSÃO DE HOJE</Text>
              <Text style={s.heroTitle}>{mission.data.title}</Text>
              {mission.data.description ? (
                <>
                  <Text style={s.meta}>Próxima ação</Text>
                  <Text style={s.body}>{mission.data.description}</Text>
                </>
              ) : null}
              <Text style={s.reward}>+{mission.data.momentumValue} Momentum</Text>
              <Pressable
                style={s.button}
                onPress={() => router.push(sourceHref(mission.data!) as never)}
              >
                <Text style={s.buttonText}>Começar missão</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.card}>
              <Text style={s.cardTitle}>Nenhuma ação elegível agora.</Text>
              <Text style={s.muted}>
                Crie uma tarefa acionável ou defina a próxima ação de um estudo.
              </Text>
            </View>
          )}
        </Section>
        <Section title="JORNADA ATIVA">
          {active.length ? (
            active.map((j) => (
              <Pressable key={j.id} style={s.card} onPress={() => router.push(`/journeys/${j.id}`)}>
                <Text style={s.cardTitle}>{j.title}</Text>
                <Text numberOfLines={2} style={s.muted}>
                  {j.objective}
                </Text>
                <Text style={s.link}>Continuar ›</Text>
              </Pressable>
            ))
          ) : (
            <View style={s.card}>
              <Text style={s.cardTitle}>Transforme uma ideia em movimento.</Text>
              <Text style={s.muted}>
                Crie uma Jornada e deixe a NEXORA transformar seu objetivo em ações que você pode
                executar todos os dias.
              </Text>
              <Pressable onPress={() => setModal(true)}>
                <Text style={s.link}>Criar primeira Jornada</Text>
              </Pressable>
              <Text style={s.meta}>Explorar modelos</Text>
              <View style={s.chips}>
                {JOURNEY_TEMPLATES.map((t) => (
                  <Pressable
                    key={t.category}
                    style={s.chip}
                    onPress={() => {
                      setCategory(t.category);
                      setTitle(t.title);
                      setModal(true);
                    }}
                  >
                    <Text style={s.chipText}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </Section>
        <Section title="MOMENTUM">
          <View style={s.card}>
            <Text style={s.metric}>
              {momentum.data?.weekPoints ?? 0} <Text style={s.metricLabel}>esta semana</Text>
            </Text>
            <Text style={s.muted}>{momentum.data?.completedMissions ?? 0} missões concluídas</Text>
            {(momentum.data?.streak ?? 0) > 0 ? (
              <Text style={s.reward}>🔥 {momentum.data!.streak} dias ativos</Text>
            ) : null}
          </View>
        </Section>
        <Section title="DESAFIO DA SEMANA">
          {challenge.data ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>{challenge.data.title}</Text>
              <Text style={s.muted}>
                {challenge.data.progress} / {challenge.data.targetValue} · termina{" "}
                {new Date(challenge.data.endsAt).toLocaleDateString("pt-BR", { weekday: "long" })}
              </Text>
              <View style={s.track}>
                <View
                  style={[
                    s.fill,
                    {
                      width: `${Math.min(100, (challenge.data.progress / challenge.data.targetValue) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={s.reward}>+{challenge.data.rewardPoints} Momentum</Text>
            </View>
          ) : (
            <Text style={s.muted}>Nenhum desafio ativo nesta semana.</Text>
          )}
        </Section>
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
        secondaryPlaceholder="Contexto e objetivo (opcional)"
        dateValue={date}
        datePlaceholder="Data-alvo: AAAA-MM-DD (opcional)"
        busy={mutations.create.isPending}
        error={mutations.create.error?.message ?? null}
        errorMessage={
          mutations.create.error?.message.includes("FREE_CREATION")
            ? "Seu plano Free permite uma Jornada ativa. Pause ou conclua a atual, ou conheça o Premium."
            : undefined
        }
        onChange={setTitle}
        onSecondaryChange={setObjective}
        onDateChange={setDate}
        onClose={() => setModal(false)}
        onSave={() => void create()}
      >
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
});
