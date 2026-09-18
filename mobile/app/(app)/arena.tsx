import { useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { useArena, useChallengeRanking, useJoinArenaChallenge } from "@/hooks/use-arena";
import { useJourneys, useMomentum } from "@/hooks/use-journeys";
import { useProfile } from "@/hooks/use-profile";
import { useUsageAnalytics } from "@/hooks/use-usage-analytics";
import { useProjects, useStudyOverview, useTasks } from "@/hooks/use-workspaces";
import {
  arenaProgressLabel,
  isCurrentArenaChallenge,
  resolveArenaChallenge,
  type ArenaChallenge,
} from "@/lib/arena";
import { getWeeklyStudyMinutes } from "@/lib/study-selectors";
import { colors, radius, shadows, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";
import { formatUsageDuration } from "@/services/usage-analytics-service";

const copy = {
  "pt-BR": {
    title: "Arena",
    subtitle: "Seu desempenho real dentro da KIVRYN.",
    heroEyebrow: "PERSONAL PERFORMANCE SYSTEM",
    heroTitle: "Seu sistema. Sua evolução.",
    heroCopy: "A Arena reúne uso real, execução, aprendizado, projetos, jornadas, momentum e desafios em uma visão única.",
    usage: "USO REAL • 7 DIAS",
    today: "hoje",
    week: "na semana",
    sessions: "aberturas",
    usageNote: "Tempo ativo no KIVRYN neste dispositivo. O histórico começa a ser registrado a partir desta versão.",
    development: "DESENVOLVIMENTO",
    execution: "Execução",
    projects: "Projetos",
    learning: "Aprendizado",
    journeys: "Jornadas",
    momentum: "MOMENTUM",
    total: "total",
    thisWeek: "esta semana",
    streak: "sequência",
    days: "dias",
    system: "SISTEMA DO USUÁRIO",
    openTasks: "tarefas abertas",
    completedTasks: "concluídas",
    activeProjects: "projetos ativos",
    studyWeek: "estudo/semana",
    activePlans: "planos ativos",
    activeJourneys: "jornadas ativas",
    insight: "KIVRYN PERFORMANCE INTELLIGENCE",
    insightCopy: "A KIVRYN pode cruzar todos esses sinais e dizer onde sua evolução está forte, onde está travando e o que deve mudar agora.",
    analyze: "Analisar minha evolução",
    challenges: "DESAFIOS DA ARENA",
    challengeCopy: "Metas verificadas transformam execução real em Momentum. Nada de ranking ou progresso inventado.",
    noChallenges: "Nenhum desafio ativo agora.",
    ranking: "RANKING SEMANAL",
    rankingCopy: "Somente Momentum verificado e membros com opt-in aparecem aqui.",
    rankingOff: "Seu ranking está desativado. Ative em Challenges para aparecer.",
    rankingOpen: "Abrir Challenges",
    yourRank: "sua posição",
    yourScore: "seu Momentum",
    noRanking: "Ainda não há Momentum público elegível nesta semana.",
    history: "HISTÓRICO DE DESAFIOS",
    partial: "Parte dos seus dados não pôde ser atualizada. A Arena está mostrando apenas informações confirmadas.",
    refresh: "Atualizar",
  },
  en: {
    title: "Arena",
    subtitle: "Your real performance inside KIVRYN.",
    heroEyebrow: "PERSONAL PERFORMANCE SYSTEM",
    heroTitle: "Your system. Your evolution.",
    heroCopy: "Arena combines real usage, execution, learning, projects, journeys, momentum and challenges in one view.",
    usage: "REAL USAGE • 7 DAYS",
    today: "today",
    week: "this week",
    sessions: "opens",
    usageNote: "Active time in KIVRYN on this device. History starts being recorded from this version onward.",
    development: "DEVELOPMENT",
    execution: "Execution",
    projects: "Projects",
    learning: "Learning",
    journeys: "Journeys",
    momentum: "MOMENTUM",
    total: "total",
    thisWeek: "this week",
    streak: "streak",
    days: "days",
    system: "USER SYSTEM",
    openTasks: "open tasks",
    completedTasks: "completed",
    activeProjects: "active projects",
    studyWeek: "study/week",
    activePlans: "active plans",
    activeJourneys: "active journeys",
    insight: "KIVRYN PERFORMANCE INTELLIGENCE",
    insightCopy: "KIVRYN can cross these signals and explain where your growth is strong, where it is stuck and what should change now.",
    analyze: "Analyze my evolution",
    challenges: "ARENA CHALLENGES",
    challengeCopy: "Verified goals turn real execution into Momentum. No invented rankings or progress.",
    noChallenges: "No active challenge right now.",
    ranking: "WEEKLY RANKING",
    rankingCopy: "Only verified Momentum and opt-in members appear here.",
    rankingOff: "Your ranking is disabled. Enable it in Challenges to appear.",
    rankingOpen: "Open Challenges",
    yourRank: "your rank",
    yourScore: "your Momentum",
    noRanking: "There is no eligible public Momentum this week yet.",
    history: "CHALLENGE HISTORY",
    partial: "Some of your data could not be refreshed. Arena is showing confirmed information only.",
    refresh: "Refresh",
  },
} as const;

const period = (challenge: ArenaChallenge, locale: string) =>
  `${new Date(challenge.startsAt).toLocaleDateString(locale)} – ${new Date(challenge.endsAt).toLocaleDateString(locale)}`;

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function DevelopmentLane({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View style={styles.lane}>
      <View style={styles.laneTop}>
        <View>
          <Text style={styles.laneLabel}>{label}</Text>
          <Text style={styles.laneDetail}>{detail}</Text>
        </View>
        <Text style={styles.laneValue}>{normalized}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${normalized}%` }]} />
      </View>
    </View>
  );
}

function UsageChart({
  series,
  locale,
}: {
  series: { date: string; activeSeconds: number; sessions: number }[];
  locale: string;
}) {
  const max = Math.max(1, ...series.map((item) => item.activeSeconds));
  return (
    <View style={styles.chart}>
      {series.map((item) => {
        const date = new Date(`${item.date}T12:00:00`);
        const height = item.activeSeconds ? Math.max(8, Math.round((item.activeSeconds / max) * 92)) : 4;
        const label = new Intl.DateTimeFormat(locale, { weekday: "short" })
          .format(date)
          .replace(".", "")
          .slice(0, 3);
        return (
          <View key={item.date} style={styles.barColumn}>
            <Text style={styles.barValue}>{Math.round(item.activeSeconds / 60)}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { height }]} />
            </View>
            <Text style={styles.barLabel}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function ChallengeCard({
  challenge,
  joining,
  onJoin,
  locale,
}: {
  challenge: ArenaChallenge;
  joining: boolean;
  onJoin(): void;
  locale: string;
}) {
  const resolved = resolveArenaChallenge(challenge);
  const stateLabel =
    resolved.state === "completed"
      ? "CONCLUÍDO"
      : resolved.state === "joined"
        ? "PARTICIPANDO"
        : resolved.state === "upcoming"
          ? "EM BREVE"
          : resolved.state === "ended"
            ? "ENCERRADO"
            : "ABERTO";
  return (
    <View style={styles.challengeCard}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{challenge.title}</Text>
        <Text style={styles.state}>{stateLabel}</Text>
      </View>
      {challenge.description ? <Text style={styles.copy}>{challenge.description}</Text> : null}
      <Text style={styles.challengeProgress}>{arenaProgressLabel(challenge)}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${resolved.ratio * 100}%` }]} />
      </View>
      <View style={styles.challengeFooter}>
        <Text style={styles.meta}>{period(challenge, locale)}</Text>
        {challenge.rewardPoints > 0 ? (
          <Text style={styles.reward}>+{challenge.rewardPoints} Momentum</Text>
        ) : null}
      </View>
      {resolved.state === "joinable" ? (
        <Pressable
          accessibilityRole="button"
          disabled={joining}
          onPress={onJoin}
          style={styles.challengeButton}
        >
          <Text style={styles.challengeButtonText}>{joining ? "Entrando…" : "Participar"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function Arena() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const locale = resolvedLocale === "en" ? "en-US" : "pt-BR";
  const profile = useProfile();
  const arena = useArena();
  const ranking = useChallengeRanking("weekly");
  const join = useJoinArenaChallenge();
  const tasksQuery = useTasks();
  const projectsQuery = useProjects();
  const studiesQuery = useStudyOverview();
  const journeysQuery = useJourneys();
  const momentumQuery = useMomentum();
  const usage = useUsageAnalytics(7);

  const loading =
    tasksQuery.isPending ||
    projectsQuery.isPending ||
    studiesQuery.isPending ||
    journeysQuery.isPending ||
    momentumQuery.isPending ||
    arena.isPending;

  const partialError =
    tasksQuery.isError ||
    projectsQuery.isError ||
    studiesQuery.isError ||
    journeysQuery.isError ||
    momentumQuery.isError ||
    arena.isError ||
    ranking.isError;

  const tasks = tasksQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const studies = studiesQuery.data ?? [];
  const journeys = journeysQuery.data ?? [];
  const momentum = momentumQuery.data;
  const allSessions = studies.flatMap((item) => item.sessions);
  const weeklyStudyMinutes = getWeeklyStudyMinutes(allSessions);
  const completedTasks = tasks.filter((task) => task.completed).length;
  const openTasks = tasks.length - completedTasks;
  const completedProjects = projects.filter((project) => project.status === "completed").length;
  const activeProjects = projects.filter((project) => !["completed", "archived"].includes(project.status)).length;
  const activeStudyPlans = studies.filter((item) => item.subject.status === "active").length;
  const weeklyTarget = studies.reduce(
    (total, item) => total + (item.subject.status === "active" ? item.subject.weeklyTargetMinutes ?? 0 : 0),
    0,
  );
  const activeJourneys = journeys.filter((journey) => journey.status === "active").length;
  const completedJourneys = journeys.filter((journey) => journey.status === "completed").length;

  const development = useMemo(
    () => ({
      execution: tasks.length ? (completedTasks / tasks.length) * 100 : 0,
      projects: projects.length ? (completedProjects / projects.length) * 100 : 0,
      learning: weeklyTarget > 0 ? Math.min(100, (weeklyStudyMinutes / weeklyTarget) * 100) : 0,
      journeys: journeys.length ? (completedJourneys / journeys.length) * 100 : 0,
    }),
    [completedJourneys, completedProjects, completedTasks, journeys.length, projects.length, tasks.length, weeklyStudyMinutes, weeklyTarget],
  );

  const challenges = arena.data ?? [];
  const current = challenges.filter((item) => isCurrentArenaChallenge(item));
  const history = challenges.filter((item) => !isCurrentArenaChallenge(item) && item.joinedAt);

  async function refreshAll() {
    await Promise.allSettled([
      tasksQuery.refetch(),
      projectsQuery.refetch(),
      studiesQuery.refetch(),
      journeysQuery.refetch(),
      momentumQuery.refetch(),
      arena.refetch(),
      ranking.refetch(),
      profile.refetch(),
      usage.refresh(),
    ]);
  }

  function askKivryn() {
    const snapshot = [
      `Tarefas: ${completedTasks} concluídas, ${openTasks} abertas.`,
      `Projetos: ${activeProjects} ativos, ${completedProjects} concluídos.`,
      `Estudos: ${weeklyStudyMinutes} minutos nesta semana, ${activeStudyPlans} planos ativos.`,
      `Jornadas: ${activeJourneys} ativas, ${completedJourneys} concluídas.`,
      `Momentum: ${momentum?.totalPoints ?? 0} total, ${momentum?.weekPoints ?? 0} nesta semana, sequência ${momentum?.streak ?? 0} dias.`,
      `Uso KIVRYN: ${formatUsageDuration(usage.today.activeSeconds)} hoje e ${formatUsageDuration(usage.weekSeconds)} nos últimos 7 dias.`,
    ].join("\n");
    router.push({
      pathname: "/assistant-chat",
      params: {
        prompt: `Analise minha evolução real dentro da KIVRYN usando este estado atual. Identifique forças, gargalos e me dê as 3 melhores ações para melhorar meu sistema agora. Não invente dados.\n\n${snapshot}`,
      },
    });
  }

  if (loading) return <LoadingState title="Montando sua Arena…" />;

  return (
    <AppScreen scroll contentContainerStyle={styles.page}>
      <StandardHeader title={text.title} subtitle={text.subtitle} />

      <View style={styles.heroCard}>
        <View style={styles.heroGlowA} />
        <View style={styles.heroGlowB} />
        <Text style={styles.eyebrow}>{text.heroEyebrow}</Text>
        <Text style={styles.heroTitle}>{text.heroTitle}</Text>
        <Text style={styles.heroCopy}>{text.heroCopy}</Text>
        {profile.data?.displayName ? (
          <Text style={styles.userName}>{profile.data.displayName}</Text>
        ) : null}
      </View>

      {partialError ? (
        <Pressable accessibilityRole="button" onPress={() => void refreshAll()} style={styles.warningCard}>
          <Text style={styles.warningText}>{text.partial}</Text>
          <Text style={styles.link}>{text.refresh}</Text>
        </Pressable>
      ) : null}

      <View style={styles.usageCard}>
        <View style={styles.sectionTop}>
          <View>
            <Text style={styles.sectionEyebrow}>{text.usage}</Text>
            <Text style={styles.sectionTitle}>{formatUsageDuration(usage.weekSeconds)}</Text>
          </View>
          <Text style={styles.livePill}>LIVE</Text>
        </View>
        <UsageChart series={usage.series} locale={locale} />
        <View style={styles.metricsRow}>
          <Metric value={formatUsageDuration(usage.today.activeSeconds)} label={text.today} />
          <View style={styles.metricDivider} />
          <Metric value={formatUsageDuration(usage.weekSeconds)} label={text.week} />
          <View style={styles.metricDivider} />
          <Metric value={usage.weekSessions} label={text.sessions} />
        </View>
        <Text style={styles.note}>{text.usageNote}</Text>
      </View>

      <View style={styles.developmentCard}>
        <Text style={styles.sectionEyebrow}>{text.development}</Text>
        <DevelopmentLane
          label={text.execution}
          value={development.execution}
          detail={`${completedTasks}/${tasks.length} tarefas concluídas`}
        />
        <DevelopmentLane
          label={text.projects}
          value={development.projects}
          detail={`${completedProjects}/${projects.length} projetos concluídos`}
        />
        <DevelopmentLane
          label={text.learning}
          value={development.learning}
          detail={weeklyTarget ? `${weeklyStudyMinutes}/${weeklyTarget} min da meta semanal` : `${weeklyStudyMinutes} min nesta semana`}
        />
        <DevelopmentLane
          label={text.journeys}
          value={development.journeys}
          detail={`${completedJourneys}/${journeys.length} jornadas concluídas`}
        />
      </View>

      <View style={styles.momentumCard}>
        <View style={styles.sectionTop}>
          <View>
            <Text style={styles.sectionEyebrow}>{text.momentum}</Text>
            <Text style={styles.momentumValue}>{momentum?.totalPoints ?? 0}</Text>
          </View>
          <View style={styles.momentumOrb}><Text style={styles.momentumSpark}>✦</Text></View>
        </View>
        <View style={styles.metricsRow}>
          <Metric value={momentum?.totalPoints ?? 0} label={text.total} />
          <View style={styles.metricDivider} />
          <Metric value={momentum?.weekPoints ?? 0} label={text.thisWeek} />
          <View style={styles.metricDivider} />
          <Metric value={`${momentum?.streak ?? 0} ${text.days}`} label={text.streak} />
        </View>
      </View>

      <View style={styles.rankingCard}>
        <View style={styles.sectionTop}>
          <View style={styles.flex}>
            <Text style={styles.sectionEyebrow}>{text.ranking}</Text>
            <Text style={styles.copy}>{text.rankingCopy}</Text>
          </View>
          <Text style={styles.livePill}>LIVE</Text>
        </View>
        {ranking.data ? (
          <>
            <View style={styles.metricsRow}>
              <Metric value={ranking.data.myRank ? `#${ranking.data.myRank}` : "—"} label={text.yourRank} />
              <View style={styles.metricDivider} />
              <Metric value={ranking.data.myScore} label={text.yourScore} />
            </View>
            {!ranking.data.optedIn ? (
              <View style={styles.rankingNotice}>
                <Text style={styles.note}>{text.rankingOff}</Text>
                <Pressable accessibilityRole="button" onPress={() => router.push("/challenges")}>
                  <Text style={styles.link}>{text.rankingOpen}</Text>
                </Pressable>
              </View>
            ) : null}
            {ranking.data.entries.length ? (
              <View style={styles.rankingList}>
                {ranking.data.entries.slice(0, 6).map((entry) => (
                  <View key={entry.memberId} style={[styles.rankingRow, entry.isSelf && styles.rankingRowSelf]}>
                    <Text style={styles.rankingPosition}>#{entry.rank}</Text>
                    <View style={styles.flex}>
                      <Text numberOfLines={1} style={styles.rankingName}>{entry.displayName}</Text>
                      {entry.username ? <Text numberOfLines={1} style={styles.meta}>@{entry.username}</Text> : null}
                    </View>
                    <Text style={styles.rankingScore}>{entry.score}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.note}>{text.noRanking}</Text>
            )}
          </>
        ) : (
          <Text style={styles.note}>{text.noRanking}</Text>
        )}
      </View>

      <View style={styles.systemCard}>
        <Text style={styles.sectionEyebrow}>{text.system}</Text>
        <View style={styles.systemGrid}>
          <View style={styles.systemTile}>
            <Text style={styles.systemIcon}>✓</Text>
            <Text style={styles.systemValue}>{openTasks}</Text>
            <Text style={styles.systemLabel}>{text.openTasks}</Text>
            <Text style={styles.systemMeta}>{completedTasks} {text.completedTasks}</Text>
          </View>
          <View style={styles.systemTile}>
            <Text style={styles.systemIcon}>◇</Text>
            <Text style={styles.systemValue}>{activeProjects}</Text>
            <Text style={styles.systemLabel}>{text.activeProjects}</Text>
            <Text style={styles.systemMeta}>{completedProjects} {text.completedTasks}</Text>
          </View>
          <View style={styles.systemTile}>
            <Text style={styles.systemIcon}>◫</Text>
            <Text style={styles.systemValue}>{weeklyStudyMinutes}</Text>
            <Text style={styles.systemLabel}>{text.studyWeek}</Text>
            <Text style={styles.systemMeta}>{activeStudyPlans} {text.activePlans}</Text>
          </View>
          <View style={styles.systemTile}>
            <Text style={styles.systemIcon}>↗</Text>
            <Text style={styles.systemValue}>{activeJourneys}</Text>
            <Text style={styles.systemLabel}>{text.activeJourneys}</Text>
            <Text style={styles.systemMeta}>{completedJourneys} {text.completedTasks}</Text>
          </View>
        </View>
      </View>

      <View style={styles.aiCard}>
        <View style={styles.aiIcon}><Text style={styles.aiSpark}>✦</Text></View>
        <View style={styles.aiBody}>
          <Text style={styles.sectionEyebrow}>{text.insight}</Text>
          <Text style={styles.aiCopy}>{text.insightCopy}</Text>
          <Pressable accessibilityRole="button" onPress={askKivryn} style={styles.aiButton}>
            <Text style={styles.aiButtonText}>{text.analyze}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.challengeSection}>
        <Text style={styles.sectionEyebrow}>{text.challenges}</Text>
        <Text style={styles.copy}>{text.challengeCopy}</Text>
        {current.length === 0 ? (
          <View style={styles.emptyChallenge}>
            <Text style={styles.emptyChallengeText}>{text.noChallenges}</Text>
          </View>
        ) : (
          current.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              joining={join.isPending && join.variables === challenge.id}
              onJoin={() => join.mutate(challenge.id)}
              locale={locale}
            />
          ))
        )}
        {join.isError ? <Text style={styles.error}>Não foi possível entrar no desafio.</Text> : null}
      </View>

      {history.length ? (
        <View style={styles.challengeSection}>
          <Text style={styles.sectionEyebrow}>{text.history}</Text>
          {history.slice(0, 4).map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              joining={false}
              onJoin={() => undefined}
              locale={locale}
            />
          ))}
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.md, paddingBottom: spacing.xxl },
  heroCard: {
    overflow: "hidden",
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.surface,
    ...shadows.raised,
  },
  heroGlowA: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -105,
    right: -55,
    backgroundColor: colors.primary,
    opacity: 0.15,
  },
  heroGlowB: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: -90,
    left: -60,
    backgroundColor: colors.accentMuted,
    opacity: 0.22,
  },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  heroTitle: { ...typography.title, color: colors.text, fontSize: 30, lineHeight: 36 },
  heroCopy: { ...typography.body, color: colors.textMuted, maxWidth: 620 },
  userName: { ...typography.label, color: colors.text, marginTop: spacing.xs },
  warningCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  warningText: { ...typography.caption, color: colors.warning },
  link: { ...typography.label, color: colors.primaryBright },
  usageCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sectionTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  sectionEyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  sectionTitle: { ...typography.title, color: colors.text, marginTop: spacing.xs },
  livePill: {
    ...typography.eyebrow,
    color: colors.success,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chart: {
    height: 140,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  barColumn: { flex: 1, minWidth: 0, alignItems: "center", gap: 4 },
  barValue: { ...typography.caption, fontSize: 10, color: colors.textMuted },
  barTrack: { height: 96, width: "70%", justifyContent: "flex-end", borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, overflow: "hidden" },
  bar: { width: "100%", borderRadius: radius.pill, backgroundColor: colors.primaryBright },
  barLabel: { ...typography.caption, fontSize: 10, color: colors.textMuted, textTransform: "uppercase" },
  metricsRow: { flexDirection: "row", alignItems: "stretch" },
  metric: { flex: 1, minWidth: 0, alignItems: "center", gap: 2, paddingVertical: spacing.sm },
  metricValue: { ...typography.heading, color: colors.text, fontSize: 18 },
  metricLabel: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
  metricDivider: { width: 1, backgroundColor: colors.border },
  note: { ...typography.caption, color: colors.textMuted },
  developmentCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  lane: { gap: spacing.sm },
  laneTop: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.md },
  laneLabel: { ...typography.heading, fontSize: 16, color: colors.text },
  laneDetail: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  laneValue: { ...typography.heading, color: colors.primaryBright, fontSize: 18 },
  track: { height: 7, overflow: "hidden", borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
  fill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.primaryBright },
  momentumCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.surface,
  },
  momentumValue: { ...typography.title, color: colors.text, fontSize: 34, lineHeight: 40, marginTop: spacing.xs },
  momentumOrb: { width: 54, height: 54, alignItems: "center", justifyContent: "center", borderRadius: 27, borderWidth: 1, borderColor: colors.accentMuted, backgroundColor: colors.surfaceRaised },
  momentumSpark: { color: colors.primaryBright, fontSize: 24 },
  rankingCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.surface,
  },
  rankingNotice: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvasElevated,
  },
  rankingList: { gap: spacing.sm },
  rankingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvasElevated,
  },
  rankingRowSelf: { borderColor: colors.primaryBright, backgroundColor: colors.accentMuted },
  rankingPosition: { ...typography.heading, width: 42, color: colors.text },
  rankingName: { ...typography.label, color: colors.text },
  rankingScore: { ...typography.heading, color: colors.primaryBright },
  flex: { flex: 1, gap: spacing.xs },
  systemCard: { gap: spacing.md },
  systemGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  systemTile: {
    width: "48%",
    flexGrow: 1,
    gap: 2,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  systemIcon: { color: colors.primaryBright, fontSize: 20, marginBottom: spacing.sm },
  systemValue: { ...typography.title, color: colors.text, fontSize: 26, lineHeight: 31 },
  systemLabel: { ...typography.label, color: colors.text },
  systemMeta: { ...typography.caption, color: colors.textMuted },
  aiCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  aiIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.accentMuted },
  aiSpark: { color: colors.primaryBright, fontSize: 22 },
  aiBody: { flex: 1, gap: spacing.sm },
  aiCopy: { ...typography.body, color: colors.textMuted },
  aiButton: { minHeight: 46, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  aiButtonText: { ...typography.label, color: colors.text },
  challengeSection: { gap: spacing.sm, marginTop: spacing.sm },
  copy: { ...typography.body, color: colors.textMuted },
  challengeCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  cardTitle: { ...typography.heading, color: colors.text, flex: 1 },
  state: { ...typography.eyebrow, color: colors.primaryBright },
  challengeProgress: { ...typography.label, color: colors.text },
  challengeFooter: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: spacing.sm },
  meta: { ...typography.caption, color: colors.textMuted },
  reward: { ...typography.label, color: colors.primaryBright },
  challengeButton: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.primary },
  challengeButtonText: { ...typography.label, color: colors.text },
  emptyChallenge: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  emptyChallengeText: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  error: { ...typography.body, color: colors.danger },
});
