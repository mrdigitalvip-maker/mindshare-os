import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppScreen } from "@/components/app-screen";
import { NativeFormModal } from "@/components/native-form-modal";
import { StandardHeader } from "@/components/product-ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { useProjects, useTasks, useWorkspaceMutations } from "@/hooks/use-workspaces";
import {
  getFocusTask,
  getRescheduleDate,
  getTaskAttentionSummary,
  getTaskCounts,
  getTaskDuePresentation,
  getTaskExecutionState,
  getTaskPriorityLabel,
  getTasksForQueue,
  type TaskQueue,
} from "@/lib/task-selectors";
import { colors, radius, spacing, typography } from "@/lib/theme";
import type { Task } from "@/services/workspace-service";

type Filter = "Agora" | "Hoje" | "Atrasadas" | "Próximas" | "Sem prazo" | "Concluídas" | "Todas";
const filters: Filter[] = [
  "Agora",
  "Hoje",
  "Atrasadas",
  "Próximas",
  "Sem prazo",
  "Concluídas",
  "Todas",
];
const filterQueue: Record<Filter, TaskQueue> = {
  Agora: "now",
  Hoje: "today",
  Atrasadas: "overdue",
  Próximas: "upcoming",
  "Sem prazo": "undated",
  Concluídas: "completed",
  Todas: "all",
};
const priorities = ["high", "medium", "low"] as const;

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function Productivity() {
  const router = useRouter();
  const tasksQuery = useTasks();
  const projectsQuery = useProjects();
  const { mutateTask } = useWorkspaceMutations();
  const [filter, setFilter] = useState<Filter>("Agora");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const counts = useMemo(() => getTaskCounts(tasks), [tasks]);
  const focus = useMemo(() => getFocusTask(tasks), [tasks]);
  const projectTitles = useMemo(
    () => new Map((projectsQuery.data ?? []).map((project) => [project.id, project.title])),
    [projectsQuery.data],
  );
  const attention = useMemo(
    () => getTaskAttentionSummary(tasks, projectsQuery.data ?? []),
    [projectsQuery.data, tasks],
  );
  const sections = useMemo(() => {
    const data = getTasksForQueue(tasks, filterQueue[filter]);
    return data.length ? [{ key: filterQueue[filter], title: filter, data }] : [];
  }, [filter, tasks]);

  if (tasksQuery.isPending) return <LoadingState title="Carregando tarefas…" />;
  if (tasksQuery.isError)
    return (
      <ErrorState
        title="Não foi possível carregar suas tarefas."
        actionLabel="Tentar novamente"
        onAction={() => void tasksQuery.refetch()}
      />
    );

  function openEditor(task?: Task) {
    mutateTask.reset();
    setActionError(null);
    setEditing(task ?? null);
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setDueDate(task?.dueDate?.slice(0, 10) ?? (filter === "Hoje" ? localDate() : ""));
    setPriority(task?.priority ?? "medium");
    setProjectId(task?.projectId ?? null);
    setModal(true);
  }

  function reschedule(task: Task) {
    const apply = (option: "tomorrow" | "three-days" | "next-week") =>
      void mutateTask
        .mutateAsync({
          action: "update",
          taskId: task.id,
          projectId: task.projectId,
          patch: { dueDate: getRescheduleDate(option) },
        })
        .catch(() => setActionError("Não foi possível adiar a tarefa."));
    Alert.alert("Adiar tarefa", "Escolha um novo prazo", [
      { text: "Amanhã", onPress: () => apply("tomorrow") },
      { text: "Em 3 dias", onPress: () => apply("three-days") },
      { text: "Próxima semana", onPress: () => apply("next-week") },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  async function save() {
    try {
      if (editing) {
        await mutateTask.mutateAsync({
          action: "update",
          taskId: editing.id,
          projectId,
          previousProjectId: editing.projectId,
          patch: { title, description, dueDate: dueDate || null, priority, projectId },
        });
      } else {
        await mutateTask.mutateAsync({
          action: "create",
          title,
          description,
          dueDate: dueDate || null,
          priority,
          projectId,
        });
      }
      setModal(false);
    } catch {
      // The modal intentionally stays open so entered values are preserved.
    }
  }

  async function toggle(task: Task) {
    if (pendingIds.has(task.id)) return;
    setActionError(null);
    setPendingIds((current) => new Set(current).add(task.id));
    try {
      await mutateTask.mutateAsync({
        action: "update",
        taskId: task.id,
        projectId: task.projectId,
        patch: { completed: !task.completed },
      });
    } catch {
      setActionError("Não foi possível atualizar a tarefa.");
    } finally {
      setPendingIds((current) => {
        const nextIds = new Set(current);
        nextIds.delete(task.id);
        return nextIds;
      });
    }
  }

  function confirmDelete(task: Task) {
    Alert.alert("Excluir tarefa?", "Esta ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          void mutateTask
            .mutateAsync({ action: "delete", taskId: task.id, projectId: task.projectId })
            .then(() => setModal(false))
            .catch(() => setActionError("Não foi possível excluir a tarefa."));
        },
      },
    ]);
  }

  const emptyCopy =
    filter === "Hoje"
      ? "Nada previsto para hoje."
      : filter === "Atrasadas"
        ? "Nenhuma tarefa atrasada."
        : filter === "Concluídas"
          ? "Nenhuma tarefa concluída."
          : filter === "Agora"
            ? "Seu espaço de execução está livre."
            : `Nenhuma tarefa em ${filter.toLowerCase()}.`;

  return (
    <AppScreen contentContainerStyle={styles.page}>
      <StandardHeader
        title="Tarefas"
        action={
          <Pressable accessibilityRole="button" onPress={() => openEditor()} style={styles.add}>
            <Text style={styles.addText}>Nova</Text>
          </Pressable>
        }
      />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            tintColor={colors.primary}
            refreshing={tasksQuery.isRefetching || projectsQuery.isRefetching}
            onRefresh={() => void Promise.all([tasksQuery.refetch(), projectsQuery.refetch()])}
          />
        }
        contentContainerStyle={sections.length ? styles.list : styles.empty}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <Text accessibilityLiveRegion="polite" style={styles.syncState}>
              {tasksQuery.isRefetching || projectsQuery.isRefetching
                ? "Sincronizando…"
                : tasksQuery.dataUpdatedAt
                  ? `Atualizado às ${new Date(tasksQuery.dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                  : "Atualização pendente"}
            </Text>
            <View
              accessibilityLabel={`${counts.overdue} atrasadas, ${counts.today} para hoje, ${counts.open} em aberto`}
              style={styles.summary}
            >
              <SummaryMetric value={counts.overdue} label="atrasadas" tone="danger" />
              <SummaryMetric value={counts.today} label="para hoje" />
              <SummaryMetric value={counts.open} label="em aberto" />
            </View>
            {focus ? (
              <View style={styles.next}>
                <Text style={styles.eyebrow}>FOCO AGORA</Text>
                <Text numberOfLines={1} style={styles.nextTitle}>
                  {focus.title}
                </Text>
                <Text style={styles.nextMeta}>
                  {getTaskDuePresentation(focus)} · {getTaskPriorityLabel(focus.priority)}
                </Text>
                {projectTitles.get(focus.projectId ?? "") ? (
                  <Text style={styles.focusProject}>{projectTitles.get(focus.projectId!)}</Text>
                ) : null}
                <View style={styles.focusActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openEditor(focus)}
                    style={styles.focusButton}
                  >
                    <Text style={styles.focusButtonText}>Abrir</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void toggle(focus)}
                    style={styles.focusButton}
                  >
                    <Text style={styles.focusButtonText}>Concluir</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => reschedule(focus)}
                    style={styles.quietButton}
                  >
                    <Text style={styles.quietButtonText}>Adiar</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            {attention.length ? (
              <View style={styles.attention}>
                <Text style={styles.eyebrow}>PRECISA DE ATENÇÃO</Text>
                {attention.slice(0, 3).map((message) => (
                  <Text key={message} style={styles.attentionText}>
                    • {message}
                  </Text>
                ))}
              </View>
            ) : null}
            {actionError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {actionError}
              </Text>
            ) : null}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
            >
              {filters.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: item === filter }}
                  key={item}
                  onPress={() => setFilter(item)}
                  style={[styles.filter, item === filter && styles.activeFilter]}
                >
                  <Text style={[styles.filterText, item === filter && styles.activeText]}>
                    {item}
                    {item === "Hoje" && counts.today
                      ? ` ${counts.today}`
                      : item === "Atrasadas" && counts.overdue
                        ? ` ${counts.overdue}`
                        : ""}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <EmptyState title={emptyCopy} actionLabel="Nova tarefa" onAction={() => openEditor()} />
        }
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {section.title} <Text style={styles.sectionCount}>{section.data.length}</Text>
          </Text>
        )}
        renderItem={({ item }) => (
          <TaskRow
            task={item}
            projectTitle={projectTitles.get(item.projectId ?? "")}
            pending={pendingIds.has(item.id)}
            onToggle={() => void toggle(item)}
            onEdit={() => openEditor(item)}
            onProject={
              item.projectId ? () => router.push(`/projects/${item.projectId}`) : undefined
            }
          />
        )}
      />
      <NativeFormModal
        visible={modal}
        title={editing ? "Editar tarefa" : "Nova tarefa"}
        placeholder="Título da tarefa"
        value={title}
        secondaryValue={description}
        secondaryPlaceholder="Descrição (opcional)"
        dateValue={dueDate}
        datePlaceholder="Data: AAAA-MM-DD (opcional)"
        busy={mutateTask.isPending}
        error={mutateTask.error?.message}
        errorMessage={
          editing ? "Não foi possível atualizar a tarefa." : "Não foi possível criar a tarefa."
        }
        onChange={setTitle}
        onSecondaryChange={setDescription}
        onDateChange={setDueDate}
        onClose={() => setModal(false)}
        onSave={() => void save()}
        destructiveAction={
          editing
            ? {
                label: "Excluir tarefa",
                busy: mutateTask.isPending,
                onPress: () => confirmDelete(editing),
              }
            : undefined
        }
      >
        <Picker label="Prioridade">
          {priorities.map((value) => (
            <PickerChip
              key={value}
              label={getTaskPriorityLabel(value)}
              selected={priority === value}
              onPress={() => setPriority(value)}
            />
          ))}
        </Picker>
        <Picker label="Projeto">
          <PickerChip
            label="Sem projeto"
            selected={!projectId}
            onPress={() => setProjectId(null)}
          />
          {(projectsQuery.data ?? []).map((project) => (
            <PickerChip
              key={project.id}
              label={project.title}
              selected={projectId === project.id}
              onPress={() => setProjectId(project.id)}
            />
          ))}
        </Picker>
      </NativeFormModal>
    </AppScreen>
  );
}

function SummaryMetric({ value, label, tone }: { value: number; label: string; tone?: "danger" }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, tone === "danger" && value > 0 && styles.danger]}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}
function Picker({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.picker}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pickerOptions}
      >
        {children}
      </ScrollView>
    </View>
  );
}
function PickerChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.pickerChip, selected && styles.activeFilter]}
    >
      <Text numberOfLines={1} style={[styles.filterText, selected && styles.activeText]}>
        {label}
      </Text>
    </Pressable>
  );
}
function TaskRow({
  task,
  projectTitle,
  pending,
  onToggle,
  onEdit,
  onProject,
}: {
  task: Task;
  projectTitle?: string;
  pending: boolean;
  onToggle(): void;
  onEdit(): void;
  onProject?: () => void;
}) {
  const state = getTaskExecutionState(task);
  return (
    <View
      style={[
        styles.task,
        state === "overdue" && styles.overdueTask,
        state === "completed" && styles.completedTask,
      ]}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`${task.completed ? "Reabrir" : "Concluir"} ${task.title}`}
        accessibilityState={{ checked: task.completed, disabled: pending }}
        disabled={pending}
        onPress={onToggle}
        style={[styles.checkbox, task.completed && styles.checked]}
      >
        <Text style={styles.checkText}>{task.completed ? "✓" : ""}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar ${task.title}. ${getTaskDuePresentation(task)}. Prioridade ${getTaskPriorityLabel(task.priority)}.`}
        onPress={onEdit}
        style={({ pressed }) => [styles.taskMain, pressed && styles.pressed]}
      >
        <Text numberOfLines={2} style={[styles.taskTitle, task.completed && styles.done]}>
          {task.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.due, state === "overdue" && styles.danger]}>
            {getTaskDuePresentation(task)}
          </Text>
          {projectTitle ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Abrir projeto ${projectTitle}`}
              onPress={onProject}
              hitSlop={10}
            >
              <Text numberOfLines={1} style={styles.project}>
                ◇ {projectTitle}
              </Text>
            </Pressable>
          ) : null}
          <Text style={styles.priority}>{getTaskPriorityLabel(task.priority)}</Text>
        </View>
      </Pressable>
      <Text style={styles.chevron}>›</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  add: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  addText: { ...typography.label, color: colors.text },
  headerContent: { gap: spacing.sm, paddingBottom: spacing.sm },
  syncState: { ...typography.caption, color: colors.textMuted },
  summary: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  metric: { flex: 1, minWidth: 0, alignItems: "center", paddingVertical: spacing.sm },
  metricValue: { ...typography.heading, color: colors.text },
  metricLabel: { ...typography.caption, color: colors.textMuted },
  danger: { color: colors.danger },
  next: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.surface,
  },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  nextTitle: { ...typography.label, color: colors.text, marginTop: spacing.xs },
  nextMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  focusProject: { ...typography.caption, color: colors.primaryBright, marginTop: spacing.xs },
  focusActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  focusButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  focusButtonText: { ...typography.label, color: colors.text },
  quietButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md },
  quietButtonText: { ...typography.label, color: colors.primaryBright },
  attention: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  attentionText: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.label, color: colors.danger },
  filters: { gap: spacing.sm, paddingVertical: spacing.xs },
  filter: {
    height: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  activeFilter: { backgroundColor: colors.primary },
  filterText: { ...typography.label, color: colors.textMuted },
  activeText: { color: colors.text },
  list: { paddingBottom: spacing.xl },
  empty: { flexGrow: 1 },
  sectionTitle: {
    ...typography.eyebrow,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionCount: { color: colors.primaryBright },
  task: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  overdueTask: { borderLeftWidth: 3, borderLeftColor: colors.danger },
  completedTask: { opacity: 0.62 },
  checkbox: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  checked: { borderColor: colors.success, backgroundColor: colors.success },
  checkText: { ...typography.label, color: colors.background },
  taskMain: { flex: 1, minWidth: 0, paddingVertical: spacing.sm },
  pressed: { opacity: 0.65 },
  taskTitle: { ...typography.body, color: colors.text },
  done: { textDecorationLine: "line-through", color: colors.textMuted },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 },
  due: { ...typography.caption, color: colors.textMuted },
  project: { ...typography.caption, color: colors.primaryBright, flexShrink: 1 },
  priority: { ...typography.caption, color: colors.textMuted },
  chevron: { fontSize: 22, color: colors.textMuted },
  picker: { gap: spacing.xs },
  pickerLabel: { ...typography.label, color: colors.text },
  pickerOptions: { gap: spacing.sm },
  pickerChip: {
    height: 42,
    maxWidth: 180,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
});
