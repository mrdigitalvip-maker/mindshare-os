import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useMemo, useState } from "react";

import { AppScreen } from "@/components/app-screen";
import { AppHeader, DrawerMenu } from "@/components/product-ui";
import { V2Progress, V2SectionState } from "@/components/v2/premium-ui";
import { useDailyMission } from "@/hooks/use-journeys";
import { useProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { useProjects, useSubjects, useTasks } from "@/hooks/use-workspaces";
import { resolveCapabilityTier } from "@/lib/capabilities";
import { getDailyActions, getWeeklyChallenge } from "@/lib/daily-experience";
import {
  getDueLabel,
  getHomeContextMessage,
  getHomeDaySummary,
  getHomeProjects,
  getNextAction,
  getProjectProgress,
} from "@/lib/dashboard-selectors";
import { getMissionExecutionTarget, getTodayMission } from "@/lib/journeys";
import { getDisplayProjectStatus } from "@/lib/presentation";
import { colors, radius, shadows, spacing, typography } from "@/lib/theme";
import { homeGreeting } from "@/lib/profile-identity";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import type { Project, Subject, Task } from "@/services/workspace-service";

const KIVRYN_ICON = require("@/assets/branding/nexora-app-icon-master.png");

const copy = {
  "pt-BR": {
    commandCenter: "COMMAND CENTER",
    systemReady: "Sistema pronto",
    focusNow: "FOCO AGORA",
    openTask: "Abrir tarefa",
    resolve: "Resolver agora",
    clear: "Seu espaço está livre agora.",
    askKivryn: "Pedir próximo passo à KIVRYN",
    today: "HOJE",
    pending: "pendentes",
    overdue: "atrasadas",
    done: "concluídas",
    quickActions: "AÇÕES RÁPIDAS",
    assistant: "Assistente",
    task: "Nova tarefa",
    project: "Novo projeto",
    studies: "Estudos",
    projects: "PROJETOS EM MOVIMENTO",
    seeAll: "Ver todos",
    continue: "CONTINUAR",
    seeStudies: "Ver estudos",
    weekly: "DESAFIO DA SEMANA",
    mission: "MISSÃO DE HOJE",
    basic: "KIVRYN BASIC",
  },
  en: {
    commandCenter: "COMMAND CENTER",
    systemReady: "System ready",
    focusNow: "FOCUS NOW",
    openTask: "Open task",
    resolve: "Resolve now",
    clear: "Your space is clear right now.",
    askKivryn: "Ask KIVRYN for the next step",
    today: "TODAY",
    pending: "pending",
    overdue: "overdue",
    done: "completed",
    quickActions: "QUICK ACTIONS",
    assistant: "Assistant",
    task: "New task",
    project: "New project",
    studies: "Studies",
    projects: "PROJECTS IN MOTION",
    seeAll: "See all",
    continue: "CONTINUE",
    seeStudies: "See studies",
    weekly: "WEEKLY CHALLENGE",
    mission: "TODAY'S MISSION",
    basic: "KIVRYN BASIC",
  },
} as const;

function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.sectionActionHit}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Metric({ value, label, danger }: { value: number; label: string; danger?: boolean }) {
  return (
    <View style={styles.metricBlock}>
      <Text style={[styles.metricValue, danger && styles.metricDanger]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ label, symbol, onPress }: { label: string; symbol: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
    >
      <View style={styles.quickIcon}>
        <Text style={styles.quickSymbol}>{symbol}</Text>
      </View>
      <Text numberOfLines={1} style={styles.quickLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

function ProjectCard({ project, tasks }: { project: Project; tasks?: Task[] }) {
  const progress = tasks ? getProjectProgress(project.id, tasks) : null;
  const nextTask = tasks?.find((task) => !task.completed);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir projeto ${project.title}`}
      onPress={() => router.push(`/projects/${project.id}`)}
      style={({ pressed }) => [styles.projectCard, pressed && styles.pressed]}
    >
      <View style={styles.projectTop}>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={styles.projectTitle}>
            {project.title}
          </Text>
          <Text numberOfLines={1} style={styles.projectStatus}>
            {getDisplayProjectStatus(project.status)}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>

      {nextTask ? (
        <Text numberOfLines={2} style={styles.projectNext}>
          {nextTask.nextAction || nextTask.title}
        </Text>
      ) : project.objective || project.description ? (
        <Text numberOfLines={2} style={styles.projectNext}>
          {project.objective || project.description}
        </Text>
      ) : null}

      {progress ? (
        <View style={styles.projectProgress}>
          <V2Progress value={progress.percentage} label={`${progress.completed}/${progress.total}`} />
          <Text style={styles.progressMeta}>{progress.percentage}%</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function StudyCard({ subject }: { subject: Subject }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continuar estudando ${subject.name}`}
      onPress={() => router.push(`/studies/${subject.id}`)}
      style={({ pressed }) => [styles.studyCard, pressed && styles.pressed]}
    >
      <View style={[styles.studyAccent, { backgroundColor: subject.color }]} />
      <View style={styles.flex}>
        <Text numberOfLines={1} style={styles.studyTitle}>
          {subject.name}
        </Text>
        <Text numberOfLines={1} style={styles.studyMeta}>
          {subject.nextAction || subject.objective || subject.description || getDisplayProjectStatus(subject.status)}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function Dashboard() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const { session } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const profile = useProfile();
  const subscription = useSubscription();
  const tasksQuery = useTasks();
  const projectsQuery = useProjects();
  const subjectsQuery = useSubjects();
  const dailyMission = useDailyMission();

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const nextAction = useMemo(() => getNextAction(tasks), [tasks]);
  const daySummary = useMemo(() => getHomeDaySummary(tasks), [tasks]);
  const contextMessage = useMemo(
    () => getHomeContextMessage(daySummary, Boolean(nextAction)),
    [daySummary, nextAction],
  );
  const activeProjects = useMemo(() => getHomeProjects(projects, tasks), [projects, tasks]);
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const tasksByProject = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.projectId) continue;
      grouped.set(task.projectId, [...(grouped.get(task.projectId) ?? []), task]);
    }
    return grouped;
  }, [tasks]);
  const subjects = useMemo(
    () =>
      (subjectsQuery.data ?? [])
        .filter((subject) => subject.status.toLowerCase() !== "archived")
        .slice(0, 2),
    [subjectsQuery.data],
  );
  const dailyActions = useMemo(
    () =>
      getDailyActions(tasks, projects, subjectsQuery.data ?? [], new Date(), {
        excludeTaskId: nextAction?.id,
      }).slice(0, 3),
    [nextAction?.id, projects, subjectsQuery.data, tasks],
  );
  const weeklyChallenge = useMemo(
    () => getWeeklyChallenge(tasks, session?.user.id ?? ""),
    [session?.user.id, tasks],
  );
  const todayMission = getTodayMission(dailyMission.data);
  const missionTarget = todayMission ? getMissionExecutionTarget(todayMission) : null;
  const greeting = homeGreeting(profile.data?.displayName);
  const tier = subscription.isError
    ? text.basic
    : resolveCapabilityTier(subscription.data?.plan, subscription.data?.status);

  async function refresh() {
    setRefreshing(true);
    await Promise.allSettled([
      profile.refetch(),
      subscription.refetch(),
      tasksQuery.refetch(),
      projectsQuery.refetch(),
      subjectsQuery.refetch(),
      dailyMission.refetch(),
    ]);
    setRefreshing(false);
  }

  return (
    <AppScreen padded={false}>
      <AppHeader onMenu={() => setDrawer(true)} />
      <DrawerMenu visible={drawer} onClose={() => setDrawer(false)} />

      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primaryBright}
            colors={[colors.primaryBright]}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroGlowA} />
          <View style={styles.heroGlowB} />
          <View style={styles.heroTop}>
            <View style={styles.brandCluster}>
              <Image source={KIVRYN_ICON} style={styles.brandIcon} />
              <View>
                <Text style={styles.commandLabel}>{text.commandCenter}</Text>
                <Text style={styles.tier}>{tier}</Text>
              </View>
            </View>
            <View style={styles.systemPill}>
              <View style={styles.liveDot} />
              <Text style={styles.systemPillText}>{text.systemReady}</Text>
            </View>
          </View>

          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.context}>{contextMessage}</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={text.assistant}
            onPress={() => router.push("/assistant")}
            style={({ pressed }) => [styles.aiStrip, pressed && styles.pressed]}
          >
            <View style={styles.aiOrb}>
              <Text style={styles.aiSpark}>✦</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.aiTitle}>KIVRYN AI</Text>
              <Text style={styles.aiCopy}>{contextMessage}</Text>
            </View>
            <Text style={styles.aiArrow}>↗</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <SectionHeader title={text.focusNow} />
          <V2SectionState
            loading={tasksQuery.isPending}
            error={tasksQuery.isError}
            retry={() => void tasksQuery.refetch()}
          />

          {!tasksQuery.isPending && !tasksQuery.isError ? (
            nextAction ? (
              <View style={styles.focusCard}>
                <View style={styles.focusAccent} />
                <View style={styles.focusContent}>
                  <Text style={styles.focusDue}>
                    {nextAction.executionStatus === "blocked" ? text.resolve : getDueLabel(nextAction)}
                  </Text>
                  <Text style={styles.focusTitle}>{nextAction.title}</Text>
                  {nextAction.projectId ? (
                    <Text numberOfLines={1} style={styles.focusMeta}>
                      {projectById.get(nextAction.projectId)?.title ?? "KIVRYN"}
                    </Text>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(`/tasks/${nextAction.id}`)}
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.primaryButtonText}>
                      {nextAction.executionStatus === "blocked" ? text.resolve : text.openTask}
                    </Text>
                    <Text style={styles.primaryButtonArrow}>→</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/assistant")}
                style={({ pressed }) => [styles.clearCard, pressed && styles.pressed]}
              >
                <View style={styles.clearIcon}>
                  <Text style={styles.clearCheck}>✓</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.clearTitle}>{text.clear}</Text>
                  <Text style={styles.clearAction}>{text.askKivryn}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            )
          ) : null}
        </View>

        <View style={styles.section}>
          <SectionHeader title={text.today} />
          <View style={styles.dayCard}>
            <View style={styles.metricsRow}>
              <Metric value={daySummary.pending} label={text.pending} />
              <View style={styles.metricDivider} />
              <Metric value={daySummary.overdue} label={text.overdue} danger={daySummary.overdue > 0} />
              <View style={styles.metricDivider} />
              <Metric value={daySummary.completed} label={text.done} />
            </View>

            {daySummary.percentage !== null ? (
              <View style={styles.dayProgressWrap}>
                <View style={styles.dayProgressTrack}>
                  <View style={[styles.dayProgressFill, { width: `${daySummary.percentage}%` }]} />
                </View>
                <Text style={styles.dayProgressText}>{daySummary.percentage}%</Text>
              </View>
            ) : null}

            {dailyActions.length ? (
              <View style={styles.dailyList}>
                {dailyActions.map((action, index) => (
                  <Pressable
                    key={action.id}
                    accessibilityRole="button"
                    onPress={() => router.push(action.href)}
                    style={[styles.dailyRow, index > 0 && styles.dailyDivider]}
                  >
                    <View style={styles.dailyDot} />
                    <View style={styles.flex}>
                      <Text numberOfLines={1} style={styles.dailyTitle}>
                        {action.title}
                      </Text>
                      <Text numberOfLines={1} style={styles.dailyMeta}>
                        {action.detail}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title={text.quickActions} />
          <View style={styles.quickGrid}>
            <QuickAction label={text.assistant} symbol="✦" onPress={() => router.push("/assistant")} />
            <QuickAction label={text.task} symbol="✓" onPress={() => router.push("/productivity")} />
            <QuickAction label={text.project} symbol="◇" onPress={() => router.push("/projects")} />
            <QuickAction label={text.studies} symbol="◫" onPress={() => router.push("/studies")} />
          </View>
        </View>

        {todayMission && missionTarget ? (
          <View style={styles.section}>
            <SectionHeader title={text.mission} />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(missionTarget.href)}
              style={({ pressed }) => [styles.missionCard, pressed && styles.pressed]}
            >
              <View style={styles.missionSymbolWrap}>
                <Text style={styles.missionSymbol}>◎</Text>
              </View>
              <View style={styles.flex}>
                <Text numberOfLines={2} style={styles.missionTitle}>
                  {todayMission.title}
                </Text>
                <Text numberOfLines={1} style={styles.missionAction}>
                  {missionTarget.label}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader title={text.projects} action={text.seeAll} onAction={() => router.push("/projects")} />
          <V2SectionState
            loading={projectsQuery.isPending}
            error={projectsQuery.isError}
            retry={() => void projectsQuery.refetch()}
          />
          {!projectsQuery.isPending && !projectsQuery.isError ? (
            activeProjects.length ? (
              <View style={styles.stack}>
                {activeProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    tasks={tasksQuery.isError ? undefined : (tasksByProject.get(project.id) ?? [])}
                  />
                ))}
              </View>
            ) : null
          ) : null}
        </View>

        {subjectsQuery.isPending || subjectsQuery.isError || subjects.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title={text.continue}
              action={text.seeStudies}
              onAction={() => router.push("/studies")}
            />
            <V2SectionState
              loading={subjectsQuery.isPending}
              error={subjectsQuery.isError}
              retry={() => void subjectsQuery.refetch()}
            />
            {!subjectsQuery.isPending && !subjectsQuery.isError ? (
              <View style={styles.stack}>
                {subjects.map((subject) => (
                  <StudyCard key={subject.id} subject={subject} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {weeklyChallenge ? (
          <View style={styles.section}>
            <SectionHeader title={text.weekly} />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(weeklyChallenge.href)}
              style={({ pressed }) => [styles.challengeCard, pressed && styles.pressed]}
            >
              <View style={styles.challengeTop}>
                <Text style={styles.challengeTitle}>{weeklyChallenge.title}</Text>
                <Text style={styles.challengeCount}>
                  {weeklyChallenge.completed}/{weeklyChallenge.target}
                </Text>
              </View>
              <View style={styles.challengeTrack}>
                <View
                  style={[
                    styles.challengeFill,
                    { width: `${Math.min(100, (weeklyChallenge.completed / weeklyChallenge.target) * 100)}%` },
                  ]}
                />
              </View>
              <Text numberOfLines={2} style={styles.challengeBenefit}>
                {weeklyChallenge.benefit}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 116,
    gap: 28,
  },
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.78 },
  hero: {
    position: "relative",
    overflow: "hidden",
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(82,229,255,0.13)",
    backgroundColor: "#07101A",
    ...shadows.raised,
  },
  heroGlowA: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    right: -90,
    top: -100,
    backgroundColor: "rgba(0,184,217,0.10)",
  },
  heroGlowB: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    left: -95,
    bottom: -115,
    backgroundColor: "rgba(139,124,246,0.08)",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  brandCluster: { flexDirection: "row", alignItems: "center", gap: 11, flexShrink: 1 },
  brandIcon: { width: 42, height: 42, borderRadius: 13 },
  commandLabel: {
    ...typography.eyebrow,
    color: colors.text,
    letterSpacing: 1.8,
  },
  tier: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  systemPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    minHeight: 30,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(84,214,160,0.14)",
    backgroundColor: "rgba(84,214,160,0.05)",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  systemPillText: { ...typography.caption, color: colors.textSecondary, fontSize: 10 },
  greeting: {
    color: colors.text,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "700",
    letterSpacing: -1,
    marginTop: 26,
  },
  context: { ...typography.body, color: colors.textSecondary, marginTop: 7, maxWidth: 360 },
  aiStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginTop: 20,
    padding: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(82,229,255,0.15)",
    backgroundColor: "rgba(13,27,40,0.84)",
  },
  aiOrb: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "rgba(82,229,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(82,229,255,0.18)",
  },
  aiSpark: { color: colors.primaryBright, fontSize: 18 },
  aiTitle: { ...typography.caption, color: colors.primaryBright, fontWeight: "800", letterSpacing: 0.8 },
  aiCopy: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  aiArrow: { color: colors.textMuted, fontSize: 18 },
  section: { gap: 11 },
  sectionHeader: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sectionTitle: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: 1.7 },
  sectionActionHit: { minHeight: 32, justifyContent: "center", paddingLeft: 12 },
  sectionAction: { ...typography.caption, color: colors.primaryBright, fontWeight: "700" },
  focusCard: {
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "rgba(82,229,255,0.20)",
    backgroundColor: colors.surface,
  },
  focusAccent: { width: 4, backgroundColor: colors.primaryBright },
  focusContent: { flex: 1, gap: 7, padding: 18 },
  focusDue: { ...typography.eyebrow, color: colors.primaryBright, letterSpacing: 1.4 },
  focusTitle: { ...typography.heading, color: colors.text, fontSize: 22, lineHeight: 28 },
  focusMeta: { ...typography.label, color: colors.textMuted },
  primaryButton: {
    minHeight: 48,
    marginTop: 5,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryBright,
  },
  primaryButtonText: { ...typography.label, color: "#001116", fontWeight: "800" },
  primaryButtonArrow: { color: "#001116", fontSize: 18, fontWeight: "700" },
  clearCard: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  clearIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(84,214,160,0.08)",
  },
  clearCheck: { color: colors.success, fontSize: 18, fontWeight: "800" },
  clearTitle: { ...typography.label, color: colors.text },
  clearAction: { ...typography.caption, color: colors.primaryBright, marginTop: 3 },
  dayCard: {
    overflow: "hidden",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  metricsRow: { flexDirection: "row", alignItems: "center", padding: 16 },
  metricBlock: { flex: 1 },
  metricValue: { ...typography.title, color: colors.text, fontSize: 28, lineHeight: 32 },
  metricDanger: { color: colors.danger },
  metricLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  metricDivider: { width: 1, height: 35, backgroundColor: colors.border, marginHorizontal: 10 },
  dayProgressWrap: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 14 },
  dayProgressTrack: {
    flex: 1,
    height: 5,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  dayProgressFill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.primaryBright },
  dayProgressText: { ...typography.caption, color: colors.textSecondary, minWidth: 34, textAlign: "right" },
  dailyList: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  dailyRow: { minHeight: 65, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 16 },
  dailyDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  dailyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryBright },
  dailyTitle: { ...typography.label, color: colors.text },
  dailyMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  quickGrid: { flexDirection: "row", gap: 9 },
  quickAction: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 5,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  quickIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
  },
  quickSymbol: { color: colors.primaryBright, fontSize: 16, fontWeight: "700" },
  quickLabel: { ...typography.caption, color: colors.textSecondary, fontSize: 10 },
  missionCard: {
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(139,124,246,0.18)",
    backgroundColor: "rgba(18,20,36,0.96)",
  },
  missionSymbolWrap: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "rgba(139,124,246,0.09)",
  },
  missionSymbol: { color: colors.violet, fontSize: 20 },
  missionTitle: { ...typography.label, color: colors.text, fontSize: 15 },
  missionAction: { ...typography.caption, color: colors.violet, marginTop: 4 },
  stack: { gap: 9 },
  projectCard: {
    gap: 11,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  projectTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  projectTitle: { ...typography.heading, color: colors.text, fontSize: 17, lineHeight: 22 },
  projectStatus: { ...typography.caption, color: colors.primaryBright, marginTop: 2, textTransform: "capitalize" },
  projectNext: { ...typography.body, color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  projectProgress: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressMeta: { ...typography.caption, color: colors.textMuted },
  studyCard: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  studyAccent: { width: 4, height: 38, borderRadius: 2 },
  studyTitle: { ...typography.label, color: colors.text, fontSize: 15 },
  studyMeta: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  challengeCard: {
    gap: 11,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(82,229,255,0.13)",
    backgroundColor: colors.surface,
  },
  challengeTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  challengeTitle: { ...typography.label, color: colors.text, flex: 1, fontSize: 15 },
  challengeCount: { ...typography.caption, color: colors.primaryBright, fontWeight: "800" },
  challengeTrack: { height: 5, overflow: "hidden", borderRadius: radius.pill, backgroundColor: colors.border },
  challengeFill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.primaryBright },
  challengeBenefit: { ...typography.caption, color: colors.textMuted },
  chevron: { color: colors.textMuted, fontSize: 24 },
});
