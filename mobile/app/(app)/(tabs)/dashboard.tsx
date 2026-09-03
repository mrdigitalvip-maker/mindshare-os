import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/components/app-screen";
import { NexoraAgent } from "@/components/nexora-agent";
import { AppHeader, DrawerMenu } from "@/components/product-ui";
import { useProfile } from "@/hooks/use-profile";
import { homeGreeting } from "@/lib/profile-identity";
import { useDailyMission } from "@/hooks/use-journeys";
import { useSubscription } from "@/hooks/use-subscription";
import { useProjects, useSubjects, useTasks } from "@/hooks/use-workspaces";
import { useAuth } from "@/providers/auth-provider";
import { resolveCapabilityTier } from "@/lib/capabilities";
import { getDailyActions, getWeeklyChallenge, type DailyAction } from "@/lib/daily-experience";
import {
  getDueLabel,
  getHomeContextMessage,
  getHomeDaySummary,
  getHomeProjects,
  getNextAction,
  getProjectProgress,
  shouldShowSecondaryMission,
} from "@/lib/dashboard-selectors";
import { getDisplayProjectStatus } from "@/lib/presentation";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { getMissionExecutionTarget, getTodayMission } from "@/lib/journeys";
import type { Project, Subject, Task } from "@/services/workspace-service";

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${action}: ${title}`}
          hitSlop={8}
          onPress={onAction}
        >
          <Text style={styles.link}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function SectionState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: boolean;
  retry: () => void;
}) {
  if (loading) return <View accessibilityLabel="Carregando seção" style={styles.skeleton} />;
  if (error)
    return (
      <View style={styles.inlineState}>
        <Text style={styles.muted}>Não foi possível carregar esta seção.</Text>
        <Pressable accessibilityRole="button" onPress={retry}>
          <Text style={styles.link}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  return null;
}

function ProjectCard({ project, tasks }: { project: Project; tasks?: Task[] }) {
  const progress = tasks ? getProjectProgress(project.id, tasks) : null;
  const nextProjectTask = tasks?.find((task) => !task.completed);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir projeto ${project.title}`}
      onPress={() => router.push(`/projects/${project.id}`)}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <Text numberOfLines={1} style={styles.cardTitle}>
          {project.title}
        </Text>
        <Text style={styles.status}>{getDisplayProjectStatus(project.status)}</Text>
      </View>
      {project.objective || project.description ? (
        <Text numberOfLines={2} style={styles.muted}>
          {project.objective || project.description}
        </Text>
      ) : null}
      {nextProjectTask ? (
        <Text numberOfLines={1} style={styles.meta}>
          Próxima ação: {nextProjectTask.nextAction || nextProjectTask.title}
        </Text>
      ) : null}
      {!tasks ? (
        <Text style={styles.meta}>Dados de tarefas indisponíveis</Text>
      ) : progress ? (
        <View
          accessible
          accessibilityLabel={`${progress.completed} de ${progress.total} tarefas concluídas`}
          accessibilityValue={{ min: 0, max: 100, now: progress.percentage }}
        >
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress.percentage}%` }]} />
          </View>
          <Text style={styles.meta}>
            {progress.completed} de {progress.total} tarefas
          </Text>
        </View>
      ) : (
        <Text style={styles.meta}>Sem tarefas vinculadas</Text>
      )}
    </Pressable>
  );
}

function StudyCard({ subject }: { subject: Subject }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continuar estudando ${subject.name}`}
      onPress={() => router.push(`/studies/${subject.id}`)}
      style={styles.studyCard}
    >
      <View style={[styles.subjectColor, { backgroundColor: subject.color }]} />
      <View style={styles.flex}>
        <Text numberOfLines={1} style={styles.itemTitle}>
          {subject.name}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {subject.nextAction ||
            subject.objective ||
            subject.description ||
            getDisplayProjectStatus(subject.status)}
        </Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

function DailyActions({ actions }: { actions: DailyAction[] }) {
  if (!actions.length) return null;
  return (
    <View style={styles.dailyRows}>
      {actions.map((action, index) => (
        <Pressable
          key={action.id}
          accessibilityRole="button"
          accessibilityLabel={`${action.title}. ${action.detail}`}
          onPress={() => router.push(action.href)}
          style={[styles.dailyRow, index > 0 && styles.dailyDivider]}
        >
          <Text style={styles.dailyBullet}>✦</Text>
          <View style={styles.flex}>
            <Text numberOfLines={2} style={styles.itemTitle}>
              {action.title}
            </Text>
            <Text numberOfLines={2} style={styles.meta}>
              {action.detail}
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function Dashboard() {
  const { session } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const profile = useProfile();
  const subscription = useSubscription();
  const tasksQuery = useTasks();
  const projectsQuery = useProjects();
  const subjectsQuery = useSubjects();
  const dailyMission = useDailyMission();
  const todayMission = getTodayMission(dailyMission.data);
  const missionTarget = todayMission ? getMissionExecutionTarget(todayMission) : null;
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const nextAction = useMemo(() => getNextAction(tasks), [tasks]);
  const daySummary = useMemo(() => getHomeDaySummary(tasks), [tasks]);
  const contextMessage = useMemo(
    () => getHomeContextMessage(daySummary, Boolean(nextAction)),
    [daySummary, nextAction],
  );
  const activeProjects = useMemo(() => getHomeProjects(projects, tasks), [projects, tasks]);
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
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
      }),
    [nextAction?.id, projects, subjectsQuery.data, tasks],
  );
  const weeklyChallenge = useMemo(
    () => getWeeklyChallenge(tasks, session?.user.id ?? ""),
    [session?.user.id, tasks],
  );
  const greeting = homeGreeting(profile.data?.displayName);
  const tier = subscription.isError
    ? "NEXORA BASIC"
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
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primaryBright}
            colors={[colors.primaryBright]}
          />
        }
      >
        <View style={styles.identity}>
          <NexoraAgent size={72} state="idle" />
          <View style={styles.identityCopy}>
            <Text style={styles.eyebrow}>{tier}</Text>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.context}>{contextMessage}</Text>
          </View>
        </View>
        {!tasksQuery.isPending && !tasksQuery.isError && nextAction ? (
          <View style={styles.section}>
            <SectionHeader
              title={nextAction.executionStatus === "blocked" ? "ATENÇÃO" : "SEU PRÓXIMO PASSO"}
            />
            <View style={styles.commandCard}>
              <Text style={styles.nextLabel}>
                {nextAction.executionStatus === "blocked"
                  ? "Há algo travando seu avanço"
                  : getDueLabel(nextAction)}
              </Text>
              <Text style={styles.nextTitle}>{nextAction.title}</Text>
              {nextAction.projectId ? (
                <Text numberOfLines={1} style={styles.meta}>
                  {projectById.get(nextAction.projectId)?.title ?? "Projeto vinculado indisponível"}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Abrir tarefa ${nextAction.title}`}
                onPress={() => router.push(`/tasks/${nextAction.id}`)}
                style={styles.commandButton}
              >
                <Text style={styles.commandButtonText}>
                  {nextAction.executionStatus === "blocked" ? "Resolver" : "Abrir tarefa"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : !tasksQuery.isPending && !tasksQuery.isError && dailyMission.isError ? (
          <View style={styles.section}>
            <SectionHeader title="MISSÃO DE HOJE" />
            <View style={styles.commandCard}>
              <Text style={styles.nextTitle}>Não foi possível atualizar sua missão.</Text>
              <Text style={styles.meta}>
                Seu dia continua disponível. Tente sincronizar novamente.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void dailyMission.refetch()}
                style={styles.commandButton}
              >
                <Text style={styles.commandButtonText}>Tentar novamente</Text>
              </Pressable>
            </View>
          </View>
        ) : !tasksQuery.isPending && !tasksQuery.isError && todayMission && missionTarget ? (
          <View style={styles.section}>
            <SectionHeader title="MISSÃO DE HOJE" />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(missionTarget.href)}
              style={styles.commandCard}
            >
              <Text style={styles.nextLabel}>MISSÃO DE HOJE</Text>
              <Text style={styles.nextTitle}>{todayMission.title}</Text>
              <Text style={styles.commandButtonText}>{missionTarget.label}</Text>
            </Pressable>
          </View>
        ) : !tasksQuery.isPending && !tasksQuery.isError ? (
          <View style={styles.section}>
            <View style={styles.commandCard}>
              <Text style={styles.nextTitle}>Seu espaço está livre agora.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/assistant")}
                style={styles.commandButton}
              >
                <Text style={styles.commandButtonText}>Planejar com a NEXORA</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {nextAction &&
        todayMission &&
        missionTarget &&
        shouldShowSecondaryMission(`/tasks/${nextAction.id}`, missionTarget.href) ? (
          <View style={styles.section}>
            <SectionHeader
              title="MISSÃO DE HOJE"
              action="Ver Jornada"
              onAction={() => router.push("/journeys")}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${missionTarget.label}: ${todayMission.title}`}
              onPress={() => router.push(missionTarget.href)}
              style={styles.nextCard}
            >
              <Text style={styles.nextLabel}>EXECUÇÃO VERIFICÁVEL</Text>
              <Text style={styles.nextTitle}>{todayMission.title}</Text>
              {todayMission.description ? (
                <Text numberOfLines={2} style={styles.meta}>
                  {todayMission.description}
                </Text>
              ) : null}
              <Text style={styles.link}>{missionTarget.label} ›</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader
            title="SEU DIA"
            action="Ver tarefas"
            onAction={() => router.push("/productivity")}
          />
          <SectionState
            loading={tasksQuery.isPending}
            error={tasksQuery.isError}
            retry={() => void tasksQuery.refetch()}
          />
          {!tasksQuery.isPending && !tasksQuery.isError ? (
            <View style={styles.todayCard}>
              <View style={styles.summary}>
                <View>
                  <Text style={styles.metric}>{daySummary.pending}</Text>
                  <Text style={styles.meta}>
                    {daySummary.pending === 1 ? "pendente hoje" : "pendentes hoje"}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View>
                  <Text style={[styles.metric, daySummary.overdue > 0 && styles.danger]}>
                    {daySummary.overdue}
                  </Text>
                  <Text style={styles.meta}>
                    {daySummary.overdue === 1 ? "atrasada" : "atrasadas"}
                  </Text>
                </View>
              </View>
              {daySummary.percentage !== null ? (
                <View
                  accessible
                  accessibilityRole="progressbar"
                  accessibilityLabel={`${daySummary.completed} de ${daySummary.total} tarefas de hoje concluídas`}
                  accessibilityValue={{ min: 0, max: daySummary.total, now: daySummary.completed }}
                  style={styles.dayProgress}
                >
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${daySummary.percentage}%` }]} />
                  </View>
                  <Text style={styles.meta}>
                    {daySummary.completed} de {daySummary.total} concluídas
                  </Text>
                </View>
              ) : null}
              {dailyActions.length ? (
                <DailyActions actions={dailyActions} />
              ) : (
                <Text style={styles.calm}>
                  Hoje está tranquilo. Nenhuma tarefa pendente com prazo.
                </Text>
              )}
            </View>
          ) : null}
        </View>

        {weeklyChallenge ? (
          <View style={styles.section}>
            <SectionHeader title="DESAFIO DA SEMANA" />
            <View style={styles.challengeCard}>
              <Text style={styles.challengeTitle}>{weeklyChallenge.title}</Text>
              <View
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={`${weeklyChallenge.completed} de ${weeklyChallenge.target} tarefas concluídas no desafio da semana`}
                accessibilityValue={{
                  min: 0,
                  max: weeklyChallenge.target,
                  now: weeklyChallenge.completed,
                }}
              >
                <View style={styles.challengeTrack}>
                  <View
                    style={[
                      styles.challengeFill,
                      { width: `${(weeklyChallenge.completed / weeklyChallenge.target) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.meta}>
                  {weeklyChallenge.completed} de {weeklyChallenge.target} concluídas
                </Text>
              </View>
              <Text style={styles.muted}>{weeklyChallenge.benefit}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver tarefas do desafio semanal"
                onPress={() => router.push(weeklyChallenge.href)}
                style={styles.openButton}
              >
                <Text style={styles.openButtonText}>Ver tarefas</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader
            title="PROJETOS EM MOVIMENTO"
            action="Ver todos"
            onAction={() => router.push("/projects")}
          />
          <SectionState
            loading={projectsQuery.isPending}
            error={projectsQuery.isError}
            retry={() => void projectsQuery.refetch()}
          />
          {!projectsQuery.isPending && !projectsQuery.isError ? (
            activeProjects.length ? (
              <View style={styles.cardList}>
                {activeProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    tasks={tasksQuery.isError ? undefined : (tasksByProject.get(project.id) ?? [])}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.calm}>Nenhum projeto ativo no momento.</Text>
            )
          ) : null}
        </View>

        {subjectsQuery.isPending || subjectsQuery.isError || subjects.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title="CONTINUAR"
              action="Ver estudos"
              onAction={() => router.push("/studies")}
            />
            <SectionState
              loading={subjectsQuery.isPending}
              error={subjectsQuery.isError}
              retry={() => void subjectsQuery.refetch()}
            />
            {!subjectsQuery.isPending && !subjectsQuery.isError ? (
              <View style={styles.cardList}>
                {subjects.map((subject) => (
                  <StudyCard key={subject.id} subject={subject} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Conversar com a NEXORA"
        accessibilityHint="Abre o Assistente"
        onPress={() => router.push("/assistant")}
        style={({ pressed }) => [styles.quickNexora, pressed && styles.quickNexoraPressed]}
      >
        <Text style={styles.quickChatSpark}>✦</Text>
        <Text style={styles.quickNexoraText}>Perguntar à NEXORA</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 104,
    gap: spacing.lg,
  },
  flex: { flex: 1, minWidth: 0 },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  identityCopy: { flex: 1, minWidth: 0 },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  greeting: { ...typography.body, color: colors.text },
  context: { ...typography.label, color: colors.textMuted, marginTop: 2 },
  hero: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  spark: { fontSize: 20, color: colors.primaryBright, paddingTop: 3 },
  title: { ...typography.heading, fontSize: 22, lineHeight: 28, color: colors.text, flex: 1 },
  section: { gap: 12 },
  sectionHeader: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sectionTitle: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: 1.5 },
  link: { ...typography.label, color: colors.primaryBright, paddingVertical: spacing.sm },
  skeleton: { height: 88, borderRadius: radius.md, backgroundColor: colors.surface },
  inlineState: {
    minHeight: 64,
    gap: spacing.xs,
    justifyContent: "center",
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  muted: { ...typography.body, color: colors.textMuted },
  calm: { ...typography.body, color: colors.textMuted, paddingVertical: spacing.sm },
  compactState: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  todayCard: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  summary: { flexDirection: "row", alignItems: "center", gap: spacing.lg, padding: spacing.md },
  metric: { ...typography.title, color: colors.text, fontSize: 25, lineHeight: 29 },
  divider: { width: 1, alignSelf: "stretch", backgroundColor: colors.border },
  itemTitle: { ...typography.body, color: colors.text },
  meta: { ...typography.label, color: colors.textMuted },
  danger: { color: colors.danger },
  arrow: { fontSize: 24, color: colors.textMuted },
  nextCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryBright,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  commandCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  commandButton: {
    minHeight: 48,
    alignSelf: "flex-start",
    justifyContent: "center",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryBright,
  },
  commandButtonText: { ...typography.label, color: colors.background },
  dayProgress: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  dailyRows: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  dailyRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  dailyDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  dailyBullet: { color: colors.primaryBright, fontSize: 13 },
  challengeCard: {
    gap: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  challengeTitle: { ...typography.heading, fontSize: 19, lineHeight: 25, color: colors.text },
  challengeTrack: {
    height: 5,
    marginBottom: spacing.sm,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  challengeFill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.primaryBright,
  },
  nextLabel: { ...typography.eyebrow, color: colors.primaryBright },
  nextTitle: { ...typography.heading, color: colors.text },
  openButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    paddingRight: spacing.md,
  },
  openButtonText: { ...typography.label, color: colors.primaryBright },
  cardList: { gap: spacing.sm },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardTitle: { ...typography.heading, color: colors.text, flex: 1 },
  status: { ...typography.label, color: colors.primaryBright, textTransform: "capitalize" },
  progressTrack: {
    height: 4,
    marginBottom: spacing.xs,
    overflow: "hidden",
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressFill: { height: 4, backgroundColor: colors.primaryBright },
  studyCard: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  subjectColor: { width: 4, height: 38, borderRadius: 2 },
  quickNexora: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.surfaceRaised,
    elevation: 7,
  },
  quickNexoraPressed: { opacity: 0.78 },
  quickChatSpark: { color: colors.primaryBright, fontSize: 16 },
  quickNexoraText: { ...typography.label, color: colors.text, letterSpacing: 1 },
});
