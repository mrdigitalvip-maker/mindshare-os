import { LocalizedCopy } from "@/components/localized-copy";
import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { NativeFormModal } from "@/components/native-form-modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { useProject, useWorkspaceMutations } from "@/hooks/use-workspaces";
import { getDueLabel } from "@/lib/dashboard-selectors";
import {
  getProjectNextAction,
  buildProjectAssistantContext,
  getLatestProjectCheckIn,
  getLatestProjectActivity,
  getProjectActivityState,
  getProjectBlockedTasks,
  getProjectDeadlineSummary,
  getProjectHealthState,
  getProjectHealthLabel,
  getProjectCheckInLabel,
  getProjectHealthSummary,
  getProjectOverdueTasks,
  getProjectProgress,
  getProjectStatusLabel,
  getProjectStudioNextAction,
  getProjectTaskSections,
  getProjectTodayTasks,
} from "@/lib/project-selectors";
import { colors, radius, spacing, typography } from "@/lib/theme";
import type { ProjectCheckInState, Task } from "@/services/workspace-service";

export default function ProjectWorkspace() {
  const params = useLocalSearchParams<{ projectId?: string }>();
  const projectId = typeof params.projectId === "string" ? params.projectId.trim() : "";
  const query = useProject(projectId);
  const { mutateTask, updateProject, deleteProject, checkIn } = useWorkspaceMutations();
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskModal, setTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectDueDate, setProjectDueDate] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [checkInState, setCheckInState] = useState<ProjectCheckInState | null>(null);
  const [checkInNote, setCheckInNote] = useState("");
  const taskSubmitting = useRef(false);
  const projectSubmitting = useRef(false);
  const checkInSubmitting = useRef(false);
  const completingTasks = useRef(new Set<string>());

  const tasks = useMemo(() => query.data?.tasks ?? [], [query.data?.tasks]);
  const sections = useMemo(() => getProjectTaskSections(tasks), [tasks]);
  if (!projectId)
    return (
      <ErrorState
        title="Projeto não encontrado"
        message="O link do projeto está incompleto."
        actionLabel="Voltar para projetos"
        onAction={() => router.replace("/projects")}
      />
    );

  if (query.isPending) return <LoadingState title="Carregando projeto…" />;
  if (query.isError && !query.data)
    return (
      <ErrorState
        title="Não foi possível carregar este projeto."
        actionLabel="Tentar novamente"
        onAction={() => void query.refetch()}
      />
    );

  if (!query.data)
    return (
      <EmptyState
        title="Projeto não encontrado"
        message="Ele pode ter sido removido."
        actionLabel="Voltar para projetos"
        onAction={() => router.replace("/projects")}
      />
    );

  const { project } = query.data;
  const checkIns = query.data.checkIns;
  const tasksAvailable = !query.data.tasksUnavailable;
  const progress = tasksAvailable ? getProjectProgress(tasks) : null;
  const next = tasksAvailable ? getProjectNextAction(tasks) : null;
  const overdue = getProjectOverdueTasks(tasks).length;
  const today = getProjectTodayTasks(tasks).length;
  const open = tasks.filter((task) => !task.completed).length;
  const health = tasksAvailable ? getProjectHealthSummary(project, tasks) : [];
  const healthState = tasksAvailable
    ? getProjectHealthState(project, tasks)
    : project.status === "completed"
      ? "completed"
      : "on_track";
  const deadline = getProjectDeadlineSummary(project);
  const blocked = tasksAvailable ? getProjectBlockedTasks(tasks) : [];
  const studioAction = tasksAvailable ? getProjectStudioNextAction(project, tasks) : null;
  const activity = getProjectActivityState(tasks, checkIns);
  const latestCheckIn = getLatestProjectCheckIn(checkIns);
  const latestActivity = getLatestProjectActivity(tasks, checkIns);
  const completed = healthState === "completed";

  function askNexora(question = "O que devo priorizar hoje?") {
    const context = buildProjectAssistantContext(project, tasks, checkIns);
    router.push({ pathname: "/assistant-chat", params: { prompt: `${question}\n\n${context}` } });
  }

  function openTask(task?: Task) {
    setEditingTask(task ?? null);
    setTaskTitle(task?.title ?? "");
    setTaskDueDate(task?.dueDate?.slice(0, 10) ?? "");
    setTaskModal(true);
  }
  async function saveTask() {
    if (taskSubmitting.current || mutateTask.isPending) return;
    taskSubmitting.current = true;
    try {
      if (editingTask)
        await mutateTask.mutateAsync({
          action: "update",
          taskId: editingTask.id,
          projectId,
          patch: { title: taskTitle, dueDate: taskDueDate || null },
        });
      else
        await mutateTask.mutateAsync({
          action: "create",
          title: taskTitle,
          dueDate: taskDueDate || null,
          projectId,
        });
      setTaskModal(false);
      setEditingTask(null);
      setTaskTitle("");
      setTaskDueDate("");
    } catch {
      /* Preserve the form for correction/retry. */
    } finally {
      taskSubmitting.current = false;
    }
  }
  async function saveCheckIn() {
    if (!checkInState || checkInSubmitting.current || checkIn.isPending) return;
    checkInSubmitting.current = true;
    try {
      await checkIn.mutateAsync({ projectId, state: checkInState, note: checkInNote });
      setCheckInState(null);
      setCheckInNote("");
    } catch {
      /* Keep the selected state and note available for retry. */
    } finally {
      checkInSubmitting.current = false;
    }
  }
  async function saveProject() {
    if (projectSubmitting.current || updateProject.isPending) return;
    const objective = projectDescription.trim();
    if (
      projectTitle.trim() === project.title &&
      objective === project.objective &&
      projectDueDate === (project.dueDate?.slice(0, 10) ?? "")
    ) {
      setProjectModal(false);
      return;
    }
    projectSubmitting.current = true;
    try {
      await updateProject.mutateAsync({
        projectId,
        patch: { title: projectTitle, objective, dueDate: projectDueDate || null },
      });
      setProjectModal(false);
    } catch {
      /* Keep canonical edit fields available for correction/retry. */
    } finally {
      projectSubmitting.current = false;
    }
  }
  async function toggleTask(task: Task) {
    if (completingTasks.current.has(task.id)) return;
    completingTasks.current.add(task.id);
    try {
      await mutateTask.mutateAsync({
        action: "update",
        taskId: task.id,
        projectId,
        previousProjectId: projectId,
        patch: { completed: !task.completed },
      });
    } finally {
      completingTasks.current.delete(task.id);
    }
  }
  function confirmDelete() {
    Alert.alert(
      "Excluir projeto?",
      tasks.length
        ? "Este projeto possui tarefas e não pode ser excluído até que elas sejam movidas ou removidas."
        : "Excluir este projeto permanentemente? Os check-ins vinculados também serão removidos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir projeto",
          style: "destructive",
          onPress: () =>
            void deleteProject
              .mutateAsync(projectId)
              .then(() => router.replace("/projects"))
              .catch(() => undefined),
        },
      ],
    );
  }
  const header = (
    <View style={styles.headerContent}>
      {query.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void query.refetch()}
          style={styles.refreshWarning}
        >
          <Text style={styles.refreshWarningText}>
            <LocalizedCopy copyKey="legacy.9529cfcb39d7" />
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.identityTop}>
        <Text accessibilityRole="header" style={styles.title}>
          {project.title}
        </Text>
        <Text
          accessibilityLabel={`Status: ${getProjectStatusLabel(project.status)}`}
          style={styles.status}
        >
          {getProjectStatusLabel(project.status)}
        </Text>
      </View>
      {project.objective || project.description ? (
        <Text style={styles.description}>{project.objective || project.description}</Text>
      ) : null}
      {!project.objective && !project.description ? (
        <Text style={styles.objectiveMissing}>
          <LocalizedCopy copyKey="legacy.1fcc83839468" />
        </Text>
      ) : null}
      <View style={styles.heroSignals}>
        {tasksAvailable ? (
          <Text style={styles.healthBadge}>{getProjectHealthLabel(healthState)}</Text>
        ) : null}
        {deadline ? (
          <Text style={deadline.days < 0 ? styles.danger : styles.meta}>{deadline.label}</Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setProjectTitle(project.title);
            setProjectDescription(project.objective || project.description);
            setProjectDueDate(project.dueDate?.slice(0, 10) ?? "");
            setProjectModal(true);
          }}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryText}>
            <LocalizedCopy copyKey="legacy.b1a6b3426231" />
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={updateProject.isPending}
          onPress={() =>
            Alert.alert(
              project.status === "completed" ? "Reabrir projeto?" : "Concluir projeto?",
              project.status === "completed"
                ? "O projeto voltará a contar como ativo no seu plano."
                : "O projeto ficará concluído e poderá ser reaberto depois.",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: project.status === "completed" ? "Reabrir" : "Concluir",
                  onPress: () =>
                    void updateProject
                      .mutateAsync({
                        projectId,
                        patch: { status: project.status === "completed" ? "active" : "completed" },
                      })
                      .catch(() => undefined),
                },
              ],
            )
          }
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryText}>
            {project.status === "completed" ? "Reabrir" : "Concluir"}
          </Text>
        </Pressable>
      </View>
      {!completed && studioAction ? (
        <View style={styles.nextCard}>
          <Text style={styles.eyebrow}>
            <LocalizedCopy copyKey="legacy.1fe543d8b14c" />
          </Text>
          <Text style={styles.nextTitle}>{studioAction.message}</Text>
          {next ? (
            <Text style={[styles.meta, getDueLabel(next).startsWith("Atrasada") && styles.danger]}>
              {getDueLabel(next)}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              studioAction.task
                ? router.push({
                    pathname: "/tasks/[taskId]",
                    params: { taskId: studioAction.task.id },
                  })
                : openTask()
            }
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>
              {studioAction.task ? "Abrir tarefa" : "Definir primeira ação"}
            </Text>
          </Pressable>
        </View>
      ) : completed ? (
        <View style={styles.completedCard}>
          <Text style={styles.eyebrow}>
            <LocalizedCopy copyKey="legacy.e3624ae3abda" />
          </Text>
          <Text style={styles.meta}>
            {progress
              ? `${progress.completed} de ${progress.total} tarefas concluídas.`
              : "Conclusão registrada sem tarefas cadastradas."}
          </Text>
        </View>
      ) : null}
      {progress ? (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${progress.completed} de ${progress.total} tarefas concluídas`}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress.ratio * 100) }}
          style={styles.overview}
        >
          <View style={styles.overviewTop}>
            <Text style={styles.sectionTitle}>
              <LocalizedCopy copyKey="legacy.a049ed347c52" />
            </Text>
            <Text style={styles.progressCopy}>
              {progress.completed} de {progress.total}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress.ratio * 100}%` }]} />
          </View>
          <View style={styles.metrics}>
            <Text style={styles.meta}>{open} abertas</Text>
            {overdue ? <Text style={styles.danger}>{overdue} atrasadas</Text> : null}
            {today ? <Text style={styles.today}>{today} hoje</Text> : null}
          </View>
        </View>
      ) : tasksAvailable ? (
        <View style={styles.overview}>
          <Text style={styles.meta}>
            <LocalizedCopy copyKey="legacy.460cb0c09b39" />
          </Text>
        </View>
      ) : null}
      {project.dueDate ? (
        <Text style={styles.meta}>
          Prazo do projeto:{" "}
          {new Date(`${project.dueDate.slice(0, 10)}T12:00:00Z`).toLocaleDateString("pt-BR", {
            dateStyle: "long",
            timeZone: "UTC",
          })}
        </Text>
      ) : null}
      {health.length ? (
        <View style={styles.attentionCard}>
          <Text style={styles.attentionTitle}>
            <LocalizedCopy copyKey="legacy.29c3bac53b69" />
          </Text>
          {health.map((message) => (
            <Text key={message} style={styles.attentionCopy}>
              • {message}
            </Text>
          ))}
        </View>
      ) : null}
      {blocked.length ? (
        <View style={styles.blockerCard}>
          <Text style={styles.attentionTitle}>
            <LocalizedCopy copyKey="legacy.60b0e9514fe9" />
          </Text>
          {blocked.slice(0, 3).map((task) => (
            <Pressable
              key={task.id}
              onPress={() =>
                router.push({ pathname: "/tasks/[taskId]", params: { taskId: task.id } })
              }
            >
              <Text style={styles.nextTitle}>{task.title}</Text>
              {task.blockerNote ? <Text style={styles.meta}>“{task.blockerNote}”</Text> : null}
              <Text style={styles.link}>
                <LocalizedCopy copyKey="legacy.5984797ed6b6" />
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => askNexora("Como destravo este projeto?")}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>
              <LocalizedCopy copyKey="legacy.a4a833bebe87" />
            </Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.activityCard}>
        <Text style={styles.sectionTitle}>
          <LocalizedCopy copyKey="legacy.373fee33d0de" />
        </Text>
        {latestActivity ? (
          <Pressable
            disabled={!latestActivity.task}
            onPress={() =>
              latestActivity.task
                ? router.push({
                    pathname: "/tasks/[taskId]",
                    params: { taskId: latestActivity.task.id },
                  })
                : undefined
            }
            style={styles.activityEntry}
          >
            <Text style={styles.description}>{latestActivity.label}</Text>
            {latestActivity.checkIn?.note ? (
              <Text numberOfLines={3} style={styles.meta}>
                {latestActivity.checkIn.note}
              </Text>
            ) : null}
            <Text style={styles.meta}>{new Date(latestActivity.at).toLocaleString("pt-BR")}</Text>
          </Pressable>
        ) : query.data.checkInsUnavailable ? (
          <Text style={styles.meta}>
            <LocalizedCopy copyKey="legacy.f25a5017b5fc" />
          </Text>
        ) : (
          <Text style={styles.meta}>
            <LocalizedCopy copyKey="legacy.78639b86c560" />
          </Text>
        )}
      </View>
      <View style={styles.checkInCard}>
        <Text style={styles.sectionTitle}>
          <LocalizedCopy copyKey="legacy.38b5e469523a" />
        </Text>
        <Text style={styles.meta}>
          <LocalizedCopy copyKey="legacy.8825fb31b958" />
        </Text>
        <View style={styles.checkInOptions}>
          {(
            [
              ["progressed", "Avancei"],
              ["unchanged", "Sem mudança"],
              ["blocked", "Estou bloqueado"],
              ["reorganize", "Preciso reorganizar"],
            ] as const
          ).map(([state, label]) => (
            <Pressable
              key={state}
              onPress={() => {
                setCheckInState(state);
                setCheckInNote("");
              }}
              style={styles.checkInOption}
            >
              <Text style={styles.secondaryText}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {latestCheckIn ? (
          <View style={styles.memory}>
            <Text style={styles.eyebrow}>
              <LocalizedCopy copyKey="legacy.08cbe48a7bcb" />
            </Text>
            <Text style={styles.description}>{getProjectCheckInLabel(latestCheckIn.state)}</Text>
            {latestCheckIn.note ? <Text style={styles.meta}>{latestCheckIn.note}</Text> : null}
            <Text style={styles.meta}>
              {new Date(latestCheckIn.createdAt).toLocaleString("pt-BR")}
            </Text>
          </View>
        ) : null}
        {activity.state === "today" ? (
          <Text style={styles.today}>
            <LocalizedCopy copyKey="legacy.d74f25f268a9" />
          </Text>
        ) : activity.state === "inactive" ? (
          <Text style={styles.meta}>
            Sem progresso significativo registrado há {activity.days} dias.
          </Text>
        ) : null}
      </View>
      {query.data.tasksUnavailable ? (
        <View style={styles.attentionCard}>
          <Text style={styles.attentionCopy}>
            <LocalizedCopy copyKey="legacy.85473edd0a0e" />
          </Text>
          <Pressable onPress={() => void query.refetch()}>
            <Text style={styles.link}>
              <LocalizedCopy copyKey="legacy.196181a87a37" />
            </Text>
          </Pressable>
        </View>
      ) : null}
      {query.data.checkInsUnavailable ? (
        <Text style={styles.meta}>
          <LocalizedCopy copyKey="legacy.91d53290b2d6" />
        </Text>
      ) : null}
      <View style={styles.assistantCard}>
        <Text style={styles.eyebrow}>
          <LocalizedCopy copyKey="legacy.a66783d2dac7" />
        </Text>
        <Text style={styles.description}>
          <LocalizedCopy copyKey="legacy.e7b979b26b7a" />
        </Text>
        <Pressable onPress={() => askNexora()} style={styles.primaryButton}>
          <Text style={styles.primaryText}>
            <LocalizedCopy copyKey="legacy.583ff152c5b8" />
          </Text>
        </Pressable>
      </View>
      <View style={styles.tasksHeading}>
        <Text style={styles.sectionTitle}>
          <LocalizedCopy copyKey="legacy.9c2daf4fbafa" />
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => openTask()}
          style={styles.compactAction}
        >
          <Text style={styles.link}>
            <LocalizedCopy copyKey="legacy.bd3d2c99c622" />
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ title: "Projeto" }} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              <LocalizedCopy copyKey="legacy.93bd8f269d14" />
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => openTask()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryText}>
                <LocalizedCopy copyKey="legacy.ef92bfce7f77" />
              </Text>
            </Pressable>
            <Pressable
              onPress={() => askNexora("Ajude a criar um plano para este projeto.")}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>
                <LocalizedCopy copyKey="legacy.a4a833bebe87" />
              </Text>
            </Pressable>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionLabel}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.task}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.completed }}
              accessibilityLabel={`${item.completed ? "Reabrir" : "Concluir"} ${item.title}`}
              disabled={mutateTask.isPending}
              onPress={() => void toggleTask(item).catch(() => undefined)}
              style={[styles.checkbox, item.completed && styles.checked]}
            >
              <Text style={styles.check}>{item.completed ? "✓" : ""}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Editar tarefa ${item.title}`}
              onPress={() => openTask(item)}
              style={styles.taskMain}
            >
              <Text numberOfLines={2} style={[styles.taskTitle, item.completed && styles.done]}>
                {item.title}
              </Text>
              <Text
                style={[styles.meta, getDueLabel(item).startsWith("Atrasada") && styles.danger]}
              >
                {getDueLabel(item)}
              </Text>
            </Pressable>
          </View>
        )}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void query.refetch().finally(() => setRefreshing(false));
            }}
            tintColor={colors.primaryBright}
            colors={[colors.primaryBright]}
          />
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={confirmDelete}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteText}>
                <LocalizedCopy copyKey="legacy.fc1b4eb6105e" />
              </Text>
            </Pressable>
            {deleteProject.isError ? (
              <Text style={styles.danger}>
                <LocalizedCopy copyKey="legacy.55d5dc6a3d4e" />
              </Text>
            ) : null}
          </View>
        }
      />

      <NativeFormModal
        visible={Boolean(checkInState)}
        title="Registrar check-in"
        placeholder="Nota opcional sobre o que aconteceu"
        value={checkInNote}
        onChange={setCheckInNote}
        busy={checkIn.isPending}
        error={
          checkIn.error
            ? "Não foi possível registrar. Verifique sua conexão e tente novamente."
            : null
        }
        onClose={() => setCheckInState(null)}
        onSave={() => void saveCheckIn()}
        valueMaxLength={1000}
      />

      <NativeFormModal
        visible={taskModal}
        title={editingTask ? "Editar tarefa" : "Nova tarefa"}
        placeholder="O que precisa ser feito?"
        value={taskTitle}
        onChange={setTaskTitle}
        dateValue={taskDueDate}
        datePlaceholder="Adicionar prazo (opcional)"
        onDateChange={setTaskDueDate}
        busy={mutateTask.isPending}
        error={mutateTask.error?.message ?? null}
        valueMaxLength={160}
        onClose={() => setTaskModal(false)}
        onSave={() => void saveTask()}
      />

      <NativeFormModal
        visible={projectModal}
        title="Editar projeto"
        placeholder="Nome do projeto"
        value={projectTitle}
        onChange={setProjectTitle}
        secondaryValue={projectDescription}
        secondaryPlaceholder="Qual resultado define o sucesso? (opcional)"
        onSecondaryChange={setProjectDescription}
        dateValue={projectDueDate}
        datePlaceholder="Adicionar prazo (opcional)"
        onDateChange={setProjectDueDate}
        busy={updateProject.isPending}
        error={updateProject.error?.message ?? null}
        valueMaxLength={120}
        secondaryMaxLength={1000}
        onClose={() => setProjectModal(false)}
        onSave={() => void saveProject()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  headerContent: { gap: spacing.md, paddingBottom: spacing.sm },
  identityTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  title: { ...typography.title, color: colors.text, flex: 1 },
  status: {
    ...typography.caption,
    color: colors.primaryBright,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    flexShrink: 0,
  },
  description: { ...typography.body, color: colors.textMuted },
  objectiveMissing: { ...typography.body, color: colors.warning, fontStyle: "italic" },
  refreshWarning: { padding: spacing.sm, borderRadius: radius.sm, backgroundColor: "#3A1D1D" },
  refreshWarningText: { ...typography.caption, color: colors.danger },
  heroSignals: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  healthBadge: {
    ...typography.eyebrow,
    color: colors.primaryBright,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actions: { flexDirection: "row", gap: spacing.sm },
  secondaryButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  secondaryText: { ...typography.label, color: colors.text },
  overview: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  overviewTop: { flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { ...typography.heading, fontSize: 19, color: colors.text },
  progressCopy: { ...typography.label, color: colors.primaryBright },
  progressTrack: {
    height: 4,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  progressFill: { height: "100%", backgroundColor: colors.primaryBright },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  meta: { ...typography.caption, color: colors.textMuted },
  danger: { color: colors.danger },
  today: { ...typography.caption, color: colors.warning },
  nextCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
  },
  attentionCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.surface,
  },
  completedCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.surface,
  },
  blockerCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  checkInCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  activityCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  activityEntry: { gap: spacing.xs },
  checkInOptions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  checkInOption: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  memory: {
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  assistantCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
  },
  attentionTitle: { ...typography.eyebrow, color: colors.warning },
  attentionCopy: { ...typography.body, color: colors.text },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  nextTitle: { ...typography.heading, fontSize: 18, color: colors.text },
  primaryButton: {
    minHeight: 44,
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryText: { ...typography.label, color: colors.text },
  tasksHeading: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  compactAction: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm },
  link: { ...typography.label, color: colors.primaryBright },
  sectionLabel: {
    ...typography.eyebrow,
    color: colors.textMuted,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  task: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  checkbox: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  checked: { backgroundColor: colors.accentMuted },
  check: { ...typography.label, color: colors.primaryBright },
  taskMain: { flex: 1, minHeight: 44, justifyContent: "center" },
  taskTitle: { ...typography.body, color: colors.text },
  done: { color: colors.textMuted, textDecorationLine: "line-through" },
  empty: {
    gap: spacing.md,
    alignItems: "flex-start",
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  emptyTitle: { ...typography.body, color: colors.textMuted },
  footer: { gap: spacing.sm, alignItems: "flex-start", paddingTop: spacing.xl },
  deleteButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm },
  deleteText: { ...typography.label, color: colors.danger },
});
