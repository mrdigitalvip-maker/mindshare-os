import { useMemo, useState } from "react";
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
  getProjectOverdueTasks,
  getProjectProgress,
  getProjectStatusLabel,
  getProjectTaskSections,
  getProjectTodayTasks,
} from "@/lib/project-selectors";
import { colors, radius, spacing, typography } from "@/lib/theme";
import type { Task } from "@/services/workspace-service";

export default function ProjectWorkspace() {
  const params = useLocalSearchParams<{ projectId?: string }>();
  const projectId = typeof params.projectId === "string" ? params.projectId.trim() : "";
  const query = useProject(projectId);
  const { mutateTask, updateProject, deleteProject } = useWorkspaceMutations();
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskModal, setTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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
  if (query.isError)
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
  const progress = getProjectProgress(tasks);
  const next = getProjectNextAction(tasks);
  const overdue = getProjectOverdueTasks(tasks).length;
  const today = getProjectTodayTasks(tasks).length;
  const open = tasks.filter((task) => !task.completed).length;

  function openTask(task?: Task) {
    setEditingTask(task ?? null);
    setTaskTitle(task?.title ?? "");
    setTaskDueDate(task?.dueDate?.slice(0, 10) ?? "");
    setTaskModal(true);
  }
  async function saveTask() {
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
    }
  }
  function confirmDelete() {
    Alert.alert(
      "Excluir projeto?",
      "O aplicativo não excluirá tarefas vinculadas. Se o banco impedir a exclusão, o projeto será mantido.",
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
      {project.description ? <Text style={styles.description}>{project.description}</Text> : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setProjectTitle(project.title);
            setProjectDescription(project.description);
            setProjectModal(true);
          }}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryText}>Editar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={updateProject.isPending}
          onPress={() =>
            void updateProject.mutateAsync({
              projectId,
              patch: { status: project.status === "completed" ? "active" : "completed" },
            })
          }
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryText}>
            {project.status === "completed" ? "Reabrir" : "Concluir"}
          </Text>
        </Pressable>
      </View>
      {progress ? (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${progress.completed} de ${progress.total} tarefas concluídas`}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress.ratio * 100) }}
          style={styles.overview}
        >
          <View style={styles.overviewTop}>
            <Text style={styles.sectionTitle}>Progresso</Text>
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
      ) : (
        <View style={styles.overview}>
          <Text style={styles.meta}>Sem tarefas vinculadas</Text>
        </View>
      )}
      <View style={styles.nextCard}>
        <Text style={styles.eyebrow}>PRÓXIMA AÇÃO</Text>
        <Text style={styles.nextTitle}>
          {next?.title ??
            (tasks.length
              ? "Todas as tarefas concluídas"
              : "Defina a primeira ação deste projeto.")}
        </Text>
        {next ? (
          <Text style={[styles.meta, getDueLabel(next).startsWith("Atrasada") && styles.danger]}>
            {getDueLabel(next)}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => openTask(next ?? undefined)}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryText}>
            {next ? "Abrir tarefa" : tasks.length ? "Nova tarefa" : "Adicionar primeira tarefa"}
          </Text>
        </Pressable>
      </View>
      <View style={styles.tasksHeading}>
        <Text style={styles.sectionTitle}>Tarefas</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => openTask()}
          style={styles.compactAction}
        >
          <Text style={styles.link}>Nova tarefa</Text>
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
            <Text style={styles.emptyTitle}>Este projeto ainda não tem tarefas.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => openTask()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryText}>Adicionar primeira tarefa</Text>
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
              onPress={() =>
                void mutateTask.mutateAsync({
                  action: "update",
                  taskId: item.id,
                  projectId,
                  patch: { completed: !item.completed },
                })
              }
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
              <Text style={styles.deleteText}>Excluir projeto</Text>
            </Pressable>
            {deleteProject.isError ? (
              <Text style={styles.danger}>Não foi possível excluir o projeto.</Text>
            ) : null}
          </View>
        }
      />
      <NativeFormModal
        visible={taskModal}
        title={editingTask ? "Editar tarefa" : "Nova tarefa"}
        placeholder="O que precisa ser feito?"
        value={taskTitle}
        onChange={setTaskTitle}
        dateValue={taskDueDate}
        datePlaceholder="Prazo (AAAA-MM-DD, opcional)"
        onDateChange={setTaskDueDate}
        busy={mutateTask.isPending}
        error={mutateTask.error ? "Não foi possível salvar a tarefa." : null}
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
        secondaryPlaceholder="Descrição (opcional)"
        onSecondaryChange={setProjectDescription}
        busy={updateProject.isPending}
        error={updateProject.error ? "Não foi possível salvar o projeto." : null}
        onClose={() => setProjectModal(false)}
        onSave={() =>
          void updateProject
            .mutateAsync({
              projectId,
              patch: { title: projectTitle, description: projectDescription },
            })
            .then(() => setProjectModal(false))
            .catch(() => undefined)
        }
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
