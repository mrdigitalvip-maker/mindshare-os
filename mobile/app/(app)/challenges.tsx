import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { ErrorState, LoadingState } from "@/components/screen-state";
import {
  useAbandonPersonalChallenge,
  useChallengeRanking,
  useChallengeSuggestions,
  useCheckInPersonalChallenge,
  useCreatePersonalChallenge,
  usePersonalChallenges,
  useSetChallengeRankingOptIn,
} from "@/hooks/use-arena";
import { useMomentum } from "@/hooks/use-journeys";
import {
  challengeLevel,
  challengeMetricLabel,
  resolvePersonalChallenge,
  type ChallengeCategory,
  type ChallengeMetric,
  type ChallengePeriod,
  type ChallengeSuggestion,
  type PersonalChallenge,
} from "@/lib/arena";
import { colors, radius, shadows, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";

const copy = {
  "pt-BR": {
    title: "Challenges",
    subtitle: "Desafios reais, Momentum e ranking com privacidade.",
    eyebrow: "KIVRYN PERFORMANCE LEAGUE",
    hero: "Transforme intenção em consistência.",
    heroCopy: "Desafios verificados usam sinais reais da KIVRYN. Fitness, bem-estar e hábitos continuam claramente marcados como autodeclarados.",
    level: "NÍVEL",
    momentum: "MOMENTUM",
    streak: "SEQUÊNCIA",
    achievements: "CONQUISTAS",
    days: "dias",
    suggested: "DESAFIO RECOMENDADO",
    suggestedCopy: "A KIVRYN escolhe sugestões a partir do estado real do seu sistema. Você decide o que aceitar.",
    accept: "Aceitar",
    customize: "Personalizar",
    replace: "Trocar",
    verified: "VERIFICADO",
    self: "AUTODECLARADO",
    reward: "Momentum ao concluir",
    builder: "CRIAR SEU DESAFIO",
    builderCopy: "Defina uma meta. A forma de verificação é determinada pelo tipo do desafio — não pode ser falsificada pelo cliente.",
    titleField: "Nome do desafio",
    create: "Criar desafio",
    creating: "Criando…",
    active: "DESAFIOS ATIVOS",
    empty: "Nenhum desafio ativo. Aceite uma recomendação ou crie o seu.",
    checkin: "Confirmar hoje",
    checking: "Confirmando…",
    automatic: "O progresso entra automaticamente quando a atividade é registrada na KIVRYN.",
    abandon: "Encerrar",
    completed: "CONCLUÍDOS",
    ranking: "RANKING",
    rankingCopy: "Somente membros que ativaram o ranking aparecem aqui. Email e ID da conta nunca são exibidos.",
    joinRanking: "Participar do ranking",
    leaveRanking: "Sair do ranking",
    profileRequired: "Para participar, publique primeiro seu perfil na Community.",
    noRanking: "Ainda não há Momentum público neste período.",
    yourRank: "Sua posição",
    ask: "Criar com a KIVRYN",
    askCopy: "Diga o objetivo em linguagem natural. A KIVRYN propõe o desafio e só cria depois da sua confirmação.",
    daily: "Hoje",
    weekly: "Semana",
    monthly: "Mês",
    target: "Meta",
    historyEmpty: "Suas conclusões aparecerão aqui.",
  },
  en: {
    title: "Challenges",
    subtitle: "Real challenges, Momentum and privacy-safe ranking.",
    eyebrow: "KIVRYN PERFORMANCE LEAGUE",
    hero: "Turn intention into consistency.",
    heroCopy: "Verified challenges use real KIVRYN signals. Fitness, wellbeing and habits remain clearly marked as self-reported.",
    level: "LEVEL",
    momentum: "MOMENTUM",
    streak: "STREAK",
    achievements: "ACHIEVEMENTS",
    days: "days",
    suggested: "RECOMMENDED CHALLENGE",
    suggestedCopy: "KIVRYN selects suggestions from the real state of your system. You decide what to accept.",
    accept: "Accept",
    customize: "Customize",
    replace: "Replace",
    verified: "VERIFIED",
    self: "SELF-REPORTED",
    reward: "Momentum on completion",
    builder: "CREATE YOUR CHALLENGE",
    builderCopy: "Define a target. Evidence is determined by challenge type and cannot be forged by the client.",
    titleField: "Challenge name",
    create: "Create challenge",
    creating: "Creating…",
    active: "ACTIVE CHALLENGES",
    empty: "No active challenge. Accept a recommendation or create your own.",
    checkin: "Confirm today",
    checking: "Confirming…",
    automatic: "Progress is added automatically when activity is recorded in KIVRYN.",
    abandon: "End",
    completed: "COMPLETED",
    ranking: "RANKING",
    rankingCopy: "Only members who opt in appear here. Account email and raw user ID are never shown.",
    joinRanking: "Join ranking",
    leaveRanking: "Leave ranking",
    profileRequired: "Publish your Community profile first to join the ranking.",
    noRanking: "There is no public Momentum for this period yet.",
    yourRank: "Your rank",
    ask: "Create with KIVRYN",
    askCopy: "Describe your goal naturally. KIVRYN proposes the challenge and only creates it after your confirmation.",
    daily: "Today",
    weekly: "Week",
    monthly: "Month",
    target: "Target",
    historyEmpty: "Your completed challenges will appear here.",
  },
} as const;

const categories: ChallengeCategory[] = ["execution", "study", "fitness", "wellbeing", "journey", "custom"];
const periods: ChallengePeriod[] = ["daily", "weekly", "monthly"];

const categoryLabels: Record<ChallengeCategory, { pt: string; en: string }> = {
  execution: { pt: "Execução", en: "Execution" },
  study: { pt: "Estudos", en: "Study" },
  fitness: { pt: "Fitness", en: "Fitness" },
  wellbeing: { pt: "Bem-estar", en: "Wellbeing" },
  journey: { pt: "Jornadas", en: "Journeys" },
  custom: { pt: "Pessoal", en: "Personal" },
};

const metricForCategory = (category: ChallengeCategory): ChallengeMetric => {
  if (category === "execution") return "task_completions";
  if (category === "study") return "study_minutes";
  if (category === "journey") return "journey_missions";
  return "self_checkins";
};

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress(): void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ProgressTrack({ ratio }: { ratio: number }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, ratio * 100))}%` }]} />
    </View>
  );
}

function EvidenceBadge({ mode, verified, self }: { mode: PersonalChallenge["evidenceMode"] | ChallengeSuggestion["evidenceMode"]; verified: string; self: string }) {
  const isVerified = mode === "verified";
  return (
    <View style={[styles.evidence, isVerified ? styles.evidenceVerified : styles.evidenceSelf]}>
      <Text style={[styles.evidenceText, isVerified ? styles.evidenceTextVerified : styles.evidenceTextSelf]}>
        {isVerified ? verified : self}
      </Text>
    </View>
  );
}

function ChallengeCard({
  challenge,
  text,
  locale,
  checking,
  onCheckIn,
  onAbandon,
}: {
  challenge: PersonalChallenge;
  text: (typeof copy)[keyof typeof copy];
  locale: string;
  checking: boolean;
  onCheckIn(): void;
  onAbandon(): void;
}) {
  const progress = resolvePersonalChallenge(challenge);
  return (
    <View style={styles.challengeCard}>
      <View style={styles.rowTop}>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{challenge.title}</Text>
          <Text style={styles.cardMeta}>
            {categoryLabels[challenge.category][locale === "pt-BR" ? "pt" : "en"]} · {challenge.period}
          </Text>
        </View>
        <EvidenceBadge mode={challenge.evidenceMode} verified={text.verified} self={text.self} />
      </View>
      {challenge.description ? <Text style={styles.bodyMuted}>{challenge.description}</Text> : null}
      <View style={styles.progressHeader}>
        <Text style={styles.progressValue}>
          {challengeMetricLabel(challenge.metric, progress.progress)} / {challengeMetricLabel(challenge.metric, progress.target)}
        </Text>
        <Text style={styles.reward}>+{challenge.rewardPoints}</Text>
      </View>
      <ProgressTrack ratio={progress.ratio} />
      <Text style={styles.cardMeta}>
        {new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(new Date(challenge.startsAt))} – {new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(new Date(challenge.endsAt))}
      </Text>
      {challenge.evidenceMode === "self_reported" ? (
        <Pressable accessibilityRole="button" disabled={checking} onPress={onCheckIn} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{checking ? text.checking : text.checkin}</Text>
        </Pressable>
      ) : (
        <Text style={styles.verifiedNote}>{text.automatic}</Text>
      )}
      <Pressable accessibilityRole="button" onPress={onAbandon} style={styles.ghostButton}>
        <Text style={styles.ghostButtonText}>{text.abandon}</Text>
      </Pressable>
    </View>
  );
}

export default function Challenges() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const locale = resolvedLocale === "en" ? "en-US" : "pt-BR";
  const challenges = usePersonalChallenges();
  const suggestions = useChallengeSuggestions();
  const createChallenge = useCreatePersonalChallenge();
  const checkIn = useCheckInPersonalChallenge();
  const abandon = useAbandonPersonalChallenge();
  const momentum = useMomentum();
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [period, setPeriod] = useState<ChallengePeriod>("weekly");
  const ranking = useChallengeRanking(period);
  const rankingOptIn = useSetChallengeRankingOptIn(period);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ChallengeCategory>("execution");
  const [builderPeriod, setBuilderPeriod] = useState<ChallengePeriod>("weekly");
  const [target, setTarget] = useState(3);

  const all = challenges.data ?? [];
  const active = all.filter((item) => item.status === "active");
  const completed = all.filter((item) => item.status === "completed");
  const suggestionList = suggestions.data ?? [];
  const suggestion = suggestionList.length ? suggestionList[suggestionIndex % suggestionList.length] : null;
  const totalMomentum = momentum.data?.totalPoints ?? 0;
  const streak = momentum.data?.streak ?? 0;
  const achievements = [completed.length > 0, totalMomentum >= 1000, streak >= 7].filter(Boolean).length;
  const level = challengeLevel(totalMomentum);
  const metric = metricForCategory(category);
  const targetStep = metric === "study_minutes" ? 15 : 1;

  const rankingError = rankingOptIn.error instanceof Error ? rankingOptIn.error.message : "";
  const needsProfile = rankingError.toLowerCase().includes("profile");

  const builderEvidence = metric === "self_checkins" ? "self_reported" : "verified";
  const rewardPreview = useMemo(() => {
    const verified = builderEvidence === "verified";
    if (builderPeriod === "daily") return verified ? 100 : 60;
    if (builderPeriod === "weekly") return verified ? 300 : 180;
    return verified ? 750 : 450;
  }, [builderEvidence, builderPeriod]);

  if (challenges.isPending || suggestions.isPending || momentum.isPending) {
    return <LoadingState title={resolvedLocale === "en" ? "Building your challenges…" : "Montando seus desafios…"} />;
  }
  if (challenges.isError && !challenges.data) {
    return <ErrorState title="Challenges" message={resolvedLocale === "en" ? "Could not load challenges." : "Não foi possível carregar seus desafios."} onRetry={() => void challenges.refetch()} />;
  }

  function customizeSuggestion(item: ChallengeSuggestion) {
    setTitle(item.title);
    setCategory(item.category);
    setBuilderPeriod(item.period);
    setTarget(item.targetValue);
  }

  function acceptSuggestion(item: ChallengeSuggestion) {
    createChallenge.mutate({
      title: item.title,
      description: item.description,
      category: item.category,
      period: item.period,
      metric: item.metric,
      targetValue: item.targetValue,
      source: "suggestion",
    });
  }

  function createManual() {
    if (!title.trim()) return;
    createChallenge.mutate(
      {
        title: title.trim(),
        category,
        period: builderPeriod,
        metric,
        targetValue: Math.max(1, target),
        source: "manual",
      },
      { onSuccess: () => setTitle("") },
    );
  }

  function confirmAbandon(item: PersonalChallenge) {
    Alert.alert(
      resolvedLocale === "en" ? "End challenge?" : "Encerrar desafio?",
      item.title,
      [
        { text: resolvedLocale === "en" ? "Cancel" : "Cancelar", style: "cancel" },
        { text: text.abandon, style: "destructive", onPress: () => abandon.mutate(item.id) },
      ],
    );
  }

  function askKivryn() {
    router.push({
      pathname: "/assistant-chat",
      params: {
        prompt:
          resolvedLocale === "en"
            ? "Create a personal challenge for me based on my current goal. Ask only what is essential, then propose the challenge as an executable KIVRYN action for me to confirm."
            : "Crie um desafio pessoal para mim com base no meu objetivo atual. Pergunte apenas o essencial e depois proponha o desafio como uma ação executável da KIVRYN para eu confirmar.",
      },
    });
  }

  return (
    <AppScreen scroll contentContainerStyle={styles.page}>
      <StandardHeader title={text.title} subtitle={text.subtitle} />

      <View style={styles.hero}>
        <View style={styles.glowA} />
        <View style={styles.glowB} />
        <Text style={styles.eyebrow}>{text.eyebrow}</Text>
        <Text style={styles.heroTitle}>{text.hero}</Text>
        <Text style={styles.bodyMuted}>{text.heroCopy}</Text>
        <View style={styles.statGrid}>
          <View style={styles.stat}><Text style={styles.statValue}>{level}</Text><Text style={styles.statLabel}>{text.level}</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{totalMomentum}</Text><Text style={styles.statLabel}>{text.momentum}</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{streak}</Text><Text style={styles.statLabel}>{text.streak}</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{achievements}</Text><Text style={styles.statLabel}>{text.achievements}</Text></View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.eyebrow}>{text.suggested}</Text>
        <Text style={styles.bodyMuted}>{text.suggestedCopy}</Text>
        {suggestion ? (
          <View style={styles.suggestionCard}>
            <View style={styles.rowTop}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{suggestion.title}</Text>
                <Text style={styles.cardMeta}>{categoryLabels[suggestion.category][resolvedLocale === "en" ? "en" : "pt"]} · {suggestion.period}</Text>
              </View>
              <EvidenceBadge mode={suggestion.evidenceMode} verified={text.verified} self={text.self} />
            </View>
            <Text style={styles.bodyMuted}>{suggestion.description}</Text>
            <View style={styles.progressHeader}>
              <Text style={styles.progressValue}>{text.target}: {challengeMetricLabel(suggestion.metric, suggestion.targetValue)}</Text>
              <Text style={styles.reward}>+{suggestion.rewardPoints}</Text>
            </View>
            <View style={styles.buttonRow}>
              <Pressable accessibilityRole="button" disabled={createChallenge.isPending} onPress={() => acceptSuggestion(suggestion)} style={[styles.primaryButton, styles.flexButton]}>
                <Text style={styles.primaryButtonText}>{text.accept}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => customizeSuggestion(suggestion)} style={[styles.secondaryButton, styles.flexButton]}>
                <Text style={styles.secondaryButtonText}>{text.customize}</Text>
              </Pressable>
            </View>
            {suggestionList.length > 1 ? (
              <Pressable accessibilityRole="button" onPress={() => setSuggestionIndex((value) => (value + 1) % suggestionList.length)} style={styles.ghostButton}>
                <Text style={styles.ghostButtonText}>{text.replace}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.builderCard}>
        <Text style={styles.eyebrow}>{text.builder}</Text>
        <Text style={styles.bodyMuted}>{text.builderCopy}</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={120}
          placeholder={text.titleField}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Text style={styles.fieldLabel}>{resolvedLocale === "en" ? "TYPE" : "TIPO"}</Text>
        <View style={styles.chips}>
          {categories.map((item) => (
            <Pill key={item} active={category === item} label={categoryLabels[item][resolvedLocale === "en" ? "en" : "pt"]} onPress={() => setCategory(item)} />
          ))}
        </View>
        <Text style={styles.fieldLabel}>{resolvedLocale === "en" ? "PERIOD" : "PERÍODO"}</Text>
        <View style={styles.chips}>
          {periods.map((item) => (
            <Pill key={item} active={builderPeriod === item} label={text[item]} onPress={() => setBuilderPeriod(item)} />
          ))}
        </View>
        <View style={styles.targetRow}>
          <View>
            <Text style={styles.fieldLabel}>{text.target.toUpperCase()}</Text>
            <Text style={styles.targetValue}>{challengeMetricLabel(metric, target)}</Text>
          </View>
          <View style={styles.stepper}>
            <Pressable accessibilityRole="button" onPress={() => setTarget((value) => Math.max(targetStep, value - targetStep))} style={styles.stepButton}><Text style={styles.stepText}>−</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setTarget((value) => Math.min(10000, value + targetStep))} style={styles.stepButton}><Text style={styles.stepText}>+</Text></Pressable>
          </View>
        </View>
        <View style={styles.builderSummary}>
          <EvidenceBadge mode={builderEvidence} verified={text.verified} self={text.self} />
          <Text style={styles.reward}>+{rewardPreview} {text.reward}</Text>
        </View>
        <Pressable accessibilityRole="button" disabled={!title.trim() || createChallenge.isPending} onPress={createManual} style={[styles.primaryButton, (!title.trim() || createChallenge.isPending) && styles.buttonDisabled]}>
          <Text style={styles.primaryButtonText}>{createChallenge.isPending ? text.creating : text.create}</Text>
        </Pressable>
        {createChallenge.isError ? <Text style={styles.errorText}>{resolvedLocale === "en" ? "Could not create this challenge." : "Não foi possível criar este desafio."}</Text> : null}
      </View>

      <View style={styles.aiCard}>
        <View style={styles.aiOrb}><Text style={styles.aiSpark}>✦</Text></View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{text.ask}</Text>
          <Text style={styles.bodyMuted}>{text.askCopy}</Text>
          <Pressable accessibilityRole="button" onPress={askKivryn} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{text.ask}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.eyebrow}>{text.active}</Text>
        {active.length ? active.map((item) => (
          <ChallengeCard
            key={item.id}
            challenge={item}
            text={text}
            locale={locale}
            checking={checkIn.isPending && checkIn.variables === item.id}
            onCheckIn={() => checkIn.mutate(item.id)}
            onAbandon={() => confirmAbandon(item)}
          />
        )) : <View style={styles.emptyCard}><Text style={styles.bodyMuted}>{text.empty}</Text></View>}
        {checkIn.isError ? <Text style={styles.errorText}>{resolvedLocale === "en" ? "Today's check-in could not be recorded. You may already have checked in." : "O check-in de hoje não pôde ser registrado. Talvez você já tenha confirmado hoje."}</Text> : null}
      </View>

      <View style={styles.rankingCard}>
        <Text style={styles.eyebrow}>{text.ranking}</Text>
        <Text style={styles.bodyMuted}>{text.rankingCopy}</Text>
        <View style={styles.chips}>
          {periods.map((item) => <Pill key={item} active={period === item} label={text[item]} onPress={() => setPeriod(item)} />)}
        </View>
        {ranking.isPending ? <Text style={styles.bodyMuted}>{resolvedLocale === "en" ? "Loading ranking…" : "Carregando ranking…"}</Text> : null}
        {ranking.data?.optedIn ? (
          <View style={styles.myRankCard}>
            <Text style={styles.fieldLabel}>{text.yourRank.toUpperCase()}</Text>
            <Text style={styles.myRankValue}>{ranking.data.myRank ? `#${ranking.data.myRank}` : "—"}</Text>
            <Text style={styles.bodyMuted}>{ranking.data.myScore} Momentum</Text>
          </View>
        ) : null}
        {(ranking.data?.entries ?? []).map((entry) => (
          <View key={`${period}-${entry.memberId}`} style={[styles.rankRow, entry.isSelf && styles.rankRowSelf]}>
            <Text style={styles.rankNumber}>#{entry.rank}</Text>
            <View style={styles.flex}>
              <Text style={styles.rankName}>{entry.displayName}</Text>
              {entry.username ? <Text style={styles.cardMeta}>@{entry.username}</Text> : null}
            </View>
            <Text style={styles.rankScore}>{entry.score}</Text>
          </View>
        ))}
        {ranking.data && ranking.data.entries.length === 0 ? <Text style={styles.emptyRanking}>{text.noRanking}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={rankingOptIn.isPending}
          onPress={() => rankingOptIn.mutate(!(ranking.data?.optedIn ?? false))}
          style={ranking.data?.optedIn ? styles.ghostButton : styles.primaryButton}
        >
          <Text style={ranking.data?.optedIn ? styles.ghostButtonText : styles.primaryButtonText}>
            {ranking.data?.optedIn ? text.leaveRanking : text.joinRanking}
          </Text>
        </Pressable>
        {needsProfile ? <Text style={styles.errorText}>{text.profileRequired}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.eyebrow}>{text.completed}</Text>
        {completed.length ? completed.slice(0, 6).map((item) => (
          <View key={item.id} style={styles.completedRow}>
            <View style={styles.flex}>
              <Text style={styles.rankName}>{item.title}</Text>
              <Text style={styles.cardMeta}>{new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(new Date(item.completedAt ?? item.endsAt))}</Text>
            </View>
            <Text style={styles.reward}>+{item.rewardPoints}</Text>
          </View>
        )) : <Text style={styles.bodyMuted}>{text.historyEmpty}</Text>}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.md, paddingBottom: spacing.xxl },
  flex: { flex: 1 },
  hero: {
    overflow: "hidden",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.surface,
    ...shadows.raised,
  },
  glowA: { position: "absolute", width: 190, height: 190, borderRadius: 95, top: -120, right: -60, backgroundColor: colors.primary, opacity: 0.18 },
  glowB: { position: "absolute", width: 150, height: 150, borderRadius: 75, bottom: -100, left: -55, backgroundColor: colors.accentMuted, opacity: 0.2 },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  heroTitle: { ...typography.title, color: colors.text, fontSize: 30, lineHeight: 36 },
  bodyMuted: { ...typography.body, color: colors.textMuted },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  stat: { flex: 1, minWidth: "45%", padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
  statValue: { ...typography.title, color: colors.text, fontSize: 26, lineHeight: 31 },
  statLabel: { ...typography.eyebrow, color: colors.textMuted, marginTop: 2 },
  section: { gap: spacing.sm, marginTop: spacing.sm },
  suggestionCard: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.accentMuted, backgroundColor: colors.surface },
  challengeCard: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  cardTitle: { ...typography.heading, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  evidence: { alignSelf: "flex-start", paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1 },
  evidenceVerified: { borderColor: colors.success, backgroundColor: colors.surfaceRaised },
  evidenceSelf: { borderColor: colors.warning, backgroundColor: colors.surfaceRaised },
  evidenceText: { ...typography.eyebrow, fontSize: 9 },
  evidenceTextVerified: { color: colors.success },
  evidenceTextSelf: { color: colors.warning },
  progressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  progressValue: { ...typography.label, color: colors.text },
  reward: { ...typography.label, color: colors.primaryBright },
  track: { height: 8, overflow: "hidden", borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
  fill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.primaryBright },
  verifiedNote: { ...typography.caption, color: colors.success },
  buttonRow: { flexDirection: "row", gap: spacing.sm },
  flexButton: { flex: 1 },
  primaryButton: { minHeight: 46, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  primaryButtonText: { ...typography.label, color: colors.text },
  secondaryButton: { minHeight: 46, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.accentMuted, backgroundColor: colors.surfaceRaised },
  secondaryButtonText: { ...typography.label, color: colors.primaryBright },
  ghostButton: { minHeight: 42, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  ghostButtonText: { ...typography.label, color: colors.textMuted },
  builderCard: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  input: { minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, color: colors.text, ...typography.body },
  fieldLabel: { ...typography.eyebrow, color: colors.textMuted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pillActive: { borderColor: colors.primaryBright, backgroundColor: colors.surfaceRaised },
  pillText: { ...typography.caption, color: colors.textMuted },
  pillTextActive: { color: colors.primaryBright },
  targetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  targetValue: { ...typography.title, color: colors.text, fontSize: 24, lineHeight: 30, marginTop: 3 },
  stepper: { flexDirection: "row", gap: spacing.sm },
  stepButton: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: 1, borderColor: colors.accentMuted, backgroundColor: colors.surfaceRaised },
  stepText: { ...typography.title, color: colors.primaryBright, fontSize: 23, lineHeight: 27 },
  builderSummary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, flexWrap: "wrap" },
  buttonDisabled: { opacity: 0.45 },
  aiCard: { flexDirection: "row", gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.accentMuted, backgroundColor: colors.surface },
  aiOrb: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 23, borderWidth: 1, borderColor: colors.accentMuted, backgroundColor: colors.surfaceRaised },
  aiSpark: { color: colors.primaryBright, fontSize: 22 },
  emptyCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  rankingCard: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.accentMuted, backgroundColor: colors.surface },
  myRankCard: { alignItems: "center", gap: 2, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.accentMuted },
  myRankValue: { ...typography.title, color: colors.primaryBright, fontSize: 34, lineHeight: 40 },
  rankRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  rankRowSelf: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.accentMuted, backgroundColor: colors.surfaceRaised },
  rankNumber: { ...typography.heading, color: colors.textMuted, width: 38 },
  rankName: { ...typography.label, color: colors.text },
  rankScore: { ...typography.heading, color: colors.primaryBright },
  emptyRanking: { ...typography.body, color: colors.textMuted, textAlign: "center", paddingVertical: spacing.md },
  completedRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  errorText: { ...typography.caption, color: colors.danger },
});
