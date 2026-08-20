import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/components/app-screen";
import { NexoraAgent } from "@/components/nexora-agent";
import { AppHeader, DrawerMenu } from "@/components/product-ui";
import { useProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { useProjects, useSubjects, useTasks } from "@/hooks/use-workspaces";
import { useAuth } from "@/providers/auth-provider";
import { resolveCapabilityTier } from "@/lib/capabilities";
import { getDailyActions, getWeeklyChallenge, type DailyAction } from "@/lib/daily-experience";
import {
  getActiveProjects,
  getDueLabel,
  getNextAction,
  getOverdueTasks,
  getProjectProgress,
  getTaskPreviews,
  getTodayTasks,
} from "@/lib/dashboard-selectors";
import { getDisplayProjectStatus } from "@/lib/presentation";
import { colors, radius, spacing, typography } from "@/lib/theme";
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

function TaskRow({ task, project }: { task: Task; project?: Project }) {
  const overdue = getDueLabel(task).startsWith("Atrasada");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${task.title}, ${getDueLabel(task)}`}
      onPress={() => router.push("/productivity")}
      style={styles.taskRow}
    >
      <View style={[styles.taskMarker, overdue && styles.taskMarkerDanger]} />
      <View style={styles.flex}>
        <Text numberOfLines={1} style={styles.itemTitle}>
          {task.title}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, overdue && styles.danger]}>
          {getDueLabel(task)}
          {project ? ` · ${project.title}` : ""}
        </Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

function ProjectCard({ project, tasks }: { project: Project; tasks: Task[] }) {
  const progress = getProjectProgress(project.id, tasks);
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
      {project.description ? (
        <Text numberOfLines={2} style={styles.muted}>
          {project.description}
        </Text>
      ) : null}
      {progress ? (
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
          {subject.description || getDisplayProjectStatus(subject.status)}
        </Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

function DailySection({ actions }: { actions: DailyAction[] }) {
  if (!actions.length) return null;
  return (
    <View style={styles.section}>
      <SectionHeader title="PARA HOJE" />
      <View style={styles.dailyCard}>
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
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const todayTasks = useMemo(() => getTodayTasks(tasks), [tasks]);
  const overdueTasks = useMemo(() => getOverdueTasks(tasks), [tasks]);
  const previews = useMemo(() => getTaskPreviews(tasks), [tasks]);
  const nextAction = useMemo(() => getNextAction(tasks), [tasks]);
  const activeProjects = useMemo(() => getActiveProjects(projects), [projects]);
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const subjects = (subjectsQuery.data ?? [])
    .filter((subject) => subject.status.toLowerCase() !== "archived")
    .slice(0, 2);
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
  const name = profile.data?.fullName?.trim().split(" ")[0] || "você";
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
          <NexoraAgent size={48} state="idle" />
          <View style={styles.identityCopy}>
            <Text style={styles.eyebrow}>{tier} · ONLINE</Text>
            <Text style={styles.greeting}>Olá, {name}.</Text>
          </View>
        </View>
        <View style={styles.hero}>
          <Text style={styles.spark}>✦</Text>
          <Text style={styles.title}>O que vamos mover hoje?</Text>
        </View>

        {!tasksQuery.isPending && !tasksQuery.isError ? (
          <View style={styles.section}>
            <SectionHeader title="AGORA" />
            {nextAction ? (
              <View style={styles.nextCard}>
                <Text style={styles.nextLabel}>{getDueLabel(nextAction)}</Text>
                <Text style={styles.nextTitle}>{nextAction.title}</Text>
                {nextAction.projectId && projectById.get(nextAction.projectId) ? (
                  <Text numberOfLines={1} style={styles.meta}>
                    {projectById.get(nextAction.projectId)?.title}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir tarefa ${nextAction.title}`}
                  onPress={() => router.push("/productivity")}
                  style={styles.openButton}
                >
                  <Text style={styles.openButtonText}>Abrir tarefas</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.calm}>Nenhuma ação urgente agora.</Text>
            )}
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader
            title="HOJE"
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
                  <Text style={styles.metric}>{todayTasks.length}</Text>
                  <Text style={styles.meta}>
                    {todayTasks.length === 1 ? "tarefa para hoje" : "tarefas para hoje"}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View>
                  <Text style={[styles.metric, overdueTasks.length > 0 && styles.danger]}>
                    {overdueTasks.length}
                  </Text>
                  <Text style={styles.meta}>
                    {overdueTasks.length === 1 ? "atrasada" : "atrasadas"}
                  </Text>
                </View>
              </View>
              {previews.length ? (
                <View style={styles.rows}>
                  {previews.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      project={task.projectId ? projectById.get(task.projectId) : undefined}
                    />
                  ))}
                </View>
              ) : (
                <Text style={styles.calm}>
                  Hoje está tranquilo. Nenhuma tarefa pendente com prazo.
                </Text>
              )}
            </View>
          ) : null}
        </View>

        {!tasksQuery.isPending &&
        !tasksQuery.isError &&
        !projectsQuery.isPending &&
        !subjectsQuery.isPending ? (
          <DailySection actions={dailyActions} />
        ) : null}

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
            title="PROJETOS ATIVOS"
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
                  <ProjectCard key={project.id} project={project} tasks={tasks} />
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
              title="CONTINUAR ESTUDANDO"
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
        <Text style={styles.quickNexoraText}>NEXORA</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 96,
    gap: spacing.xl,
  },
  flex: { flex: 1, minWidth: 0 },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  identityCopy: { flex: 1, minWidth: 0 },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  greeting: { ...typography.body, color: colors.text },
  hero: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  spark: { fontSize: 20, color: colors.primaryBright, paddingTop: 3 },
  title: { ...typography.display, fontSize: 28, lineHeight: 34, color: colors.text, flex: 1 },
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
  rows: { borderTopWidth: 1, borderTopColor: colors.border },
  taskRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  taskMarker: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primaryBright },
  taskMarkerDanger: { backgroundColor: colors.danger },
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
  dailyCard: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
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
