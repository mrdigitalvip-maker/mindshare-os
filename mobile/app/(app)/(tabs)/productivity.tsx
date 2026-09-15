import { useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppScreen } from "@/components/app-screen";
import { NativeFormModal } from "@/components/native-form-modal";
import { StandardHeader } from "@/components/product-ui";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { useProjects, useTasks, useWorkspaceMutations } from "@/hooks/use-workspaces";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";
import type { Task } from "@/services/workspace-service";
import { cancelTaskReminder } from "@/services/notification-service";

type FilterKey = "today" | "upcoming" | "completed" | "all";
const filters: FilterKey[] = ["today", "upcoming", "completed", "all"];
const priorities = ["high", "medium", "low"] as const;

const copy = {
  "pt-BR": {
    title: "Tarefas",
    newTask: "Nova tarefa",
    search: "Pesquisar tarefas",
    create: "Criar uma tarefa",
    add: "Adicionar",
    loading: "Carregando tarefas…",
    error: "Não foi possível carregar suas tarefas.",
    retry: "Tentar novamente",
    empty: "Nenhuma tarefa aqui.",
    emptyHint: "Crie uma tarefa ou escolha outra lista.",
    start: "Comece agora",
    startHint: "Crie uma primeira tarefa útil com um toque.",
    filters: { today: "Hoje", upcoming: "Próximas", completed: "Concluídas", all: "Tudo" },
    templates: [
      ["Definir minha prioridade de hoje", "Escolha o resultado mais importante para concluir hoje."],
      ["Revisar meu projeto principal", "Abra o projeto mais importante e defina a próxima ação."],
      ["Organizar minha próxima ação", "Transforme algo pendente em uma ação clara e executável."],
    ],
    edit: "Editar tarefa",
    delete: "Excluir tarefa",
    deleteQuestion: "Excluir tarefa?",
    deleteBody: "Esta ação não pode ser desfeita.",
    cancel: "Cancelar",
    description: "Descrição (opcional)",
    due: "Prazo (opcional)",
    priority: "Prioridade",
    project: "Projeto",
    noProject: "Sem projeto",
    high: "Alta",
    medium: "Média",
    low: "Baixa",
    overdue: "Atrasada",
    today: "Hoje",
    noDate: "Sem prazo",
    actionError: "Não foi possível atualizar a tarefa.",
  },
  en: {
    title: "Tasks",
    newTask: "New task",
    search: "Search tasks",
    create: "Create a task",
    add: "Add",
    loading: "Loading tasks…",
    error: "We couldn't load your tasks.",
    retry: "Try again",
    empty: "No tasks here.",
    emptyHint: "Create a task or choose another list.",
    start: "Start now",
    startHint: "Create a useful first task with one tap.",
    filters: { today: "Today", upcoming: "Upcoming", completed: "Completed", all: "All" },
    templates: [
      ["Set my priority for today", "Choose the most important result to finish today."],
      ["Review my main project", "Open the most important project and define its next action."],
      ["Organize my next action", "Turn something pending into a clear, executable action."],
    ],
    edit: "Edit task",
    delete: "Delete task",
    deleteQuestion: "Delete task?",
    deleteBody: "This action cannot be undone.",
    cancel: "Cancel",
    description: "Description (optional)",
    due: "Due date (optional)",
    priority: "Priority",
    project: "Project",
    noProject: "No project",
    high: "High",
    medium: "Medium",
    low: "Low",
    overdue: "Overdue",
    today: "Today",
    noDate: "No due date",
    actionError: "We couldn't update the task.",
  },
} as const;

function localDay() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
const dueKey = (value?: string | null) => (value ? value.slice(0, 10) : null);
const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };

export default function Productivity() {
  const router = useRouter();
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const tasksQuery = useTasks();
  const projectsQuery = useProjects();
  const { mutateTask } = useWorkspaceMutations();
  const [filter, setFilter] = useState<FilterKey>("today");
  const [search, setSearch] = useState("");
  const [quickTitle, setQuickTitle] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const pendingIds = useRef(new Set<string>());
  const saveGuard = useRef(false);
  const deleteGuard = useRef(new Set<string>());

  const allTasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const today = localDay();
  const tasks = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allTasks
      .filter((task) => {
        const due = dueKey(task.dueDate);
        const matchesSearch = `${task.title} ${task.description} ${projectById.get(task.projectId ?? "")?.title ?? ""}`
          .toLowerCase()
          .includes(needle);
        const matchesFilter =
          (filter === "today" && !task.completed && !!due && due <= today) ||
          (filter === "upcoming" && !task.completed && !!due && due > today) ||
          (filter === "completed" && task.completed) ||
          filter === "all";
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const dueA = dueKey(a.dueDate) ?? "9999-12-31";
        const dueB = dueKey(b.dueDate) ?? "9999-12-31";
        if (dueA !== dueB) return dueA.localeCompare(dueB);
        return (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
      });
  }, [allTasks, filter, projectById, search, today]);

  if (tasksQuery.isPending) return <LoadingState title={text.loading} />;
  if (tasksQuery.isError)
    return <ErrorState title={text.error} actionLabel={text.retry} onAction={() => void tasksQuery.refetch()} />;

  function openEditor(task?: Task) {
    mutateTask.reset();
    setActionError(null);
    setEditing(task ?? null);
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setDueDate(task?.dueDate?.slice(0, 10) ?? "");
    setPriority(task?.priority ?? "medium");
    setProjectId(task?.projectId ?? null);
    setModal(true);
  }

  async function createQuick(nextTitle = quickTitle) {
    const cleanTitle = nextTitle.trim();
    if (!cleanTitle || mutateTask.isPending) return;
    setActionError(null);
    try {
      await mutateTask.mutateAsync({ action: "create", title: cleanTitle, priority: "medium", dueDate: null });
      setQuickTitle("");
      setFilter("all");
    } catch {
      setActionError(text.actionError);
    }
  }

  async function save() {
    if (saveGuard.current || mutateTask.isPending || !title.trim()) return;
    saveGuard.current = true;
    setActionError(null);
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
      setActionError(text.actionError);
    } finally {
      saveGuard.current = false;
    }
  }

  async function toggle(task: Task) {
    if (pendingIds.current.has(task.id)) return;
    pendingIds.current.add(task.id);
    setActionError(null);
    try {
      await mutateTask.mutateAsync({
        action: "update",
        taskId: task.id,
        projectId: task.projectId,
        patch: task.completed
          ? { completed: false, executionStatus: "in_progress", reminderAt: null }
          : { completed: true, executionStatus: "completed", reminderAt: null },
      });
      if (!task.completed) await cancelTaskReminder(task.id);
    } catch {
      setActionError(text.actionError);
    } finally {
      pendingIds.current.delete(task.id);
    }
  }

  function confirmDelete(task: Task) {
    Alert.alert(text.deleteQuestion, text.deleteBody, [
      { text: text.cancel, style: "cancel" },
      {
        text: text.delete,
        style: "destructive",
        onPress: () => {
          if (deleteGuard.current.has(task.id)) return;
          deleteGuard.current.add(task.id);
          void mutateTask
            .mutateAsync({ action: "delete", taskId: task.id, projectId: task.projectId })
            .then(() => cancelTaskReminder(task.id))
            .then(() => setModal(false))
            .catch(() => setActionError(text.actionError))
            .finally(() => deleteGuard.current.delete(task.id));
        },
      },
    ]);
  }

  return (
    <AppScreen keyboard includeBottomInset contentContainerStyle={styles.page}>
      <StandardHeader
        title={text.title}
        action={
          <Pressable accessibilityRole="button" accessibilityLabel={text.newTask} onPress={() => openEditor()} style={styles.headerAdd}>
            <Text style={styles.headerAddText}>＋</Text>
          </Pressable>
        }
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((item) => (
          <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}>
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{text.filters[item]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={text.search}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            tintColor={colors.primaryBright}
            colors={[colors.primaryBright]}
            refreshing={tasksQuery.isRefetching || projectsQuery.isRefetching}
            onRefresh={() => void Promise.all([tasksQuery.refetch(), projectsQuery.refetch()])}
          />
        }
        contentContainerStyle={[styles.list, tasks.length === 0 && styles.listEmpty]}
        renderItem={({ item }) => (
          <TaskRow
            task={item}
            projectTitle={projectById.get(item.projectId ?? "")?.title}
            text={text}
            locale={resolvedLocale}
            onToggle={() => void toggle(item)}
            onOpen={() => router.push(`/tasks/${item.id}`)}
            onEdit={() => openEditor(item)}
            onProject={item.projectId ? () => router.push(`/projects/${item.projectId}`) : undefined}
          />
        )}
        ListEmptyComponent={
          allTasks.length === 0 ? (
            <View style={styles.starters}>
              <Text style={styles.starterHeading}>{text.start}</Text>
              <Text style={styles.starterHint}>{text.startHint}</Text>
              {text.templates.map(([templateTitle, templateDescription]) => (
                <Pressable key={templateTitle} onPress={() => void createQuick(templateTitle)} style={styles.starterCard}>
                  <View style={styles.flex}>
                    <Text style={styles.starterTitle}>{templateTitle}</Text>
                    <Text style={styles.starterDescription}>{templateDescription}</Text>
                  </View>
                  <Text style={styles.plus}>＋</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{text.empty}</Text>
              <Text style={styles.emptyHint}>{text.emptyHint}</Text>
            </View>
          )
        }
      />

      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

      <View style={styles.composer}>
        <TextInput
          value={quickTitle}
          onChangeText={setQuickTitle}
          placeholder={text.create}
          placeholderTextColor={colors.textMuted}
          style={styles.composerInput}
          returnKeyType="done"
          onSubmitEditing={() => void createQuick()}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.add}
          disabled={!quickTitle.trim() || mutateTask.isPending}
          onPress={() => void createQuick()}
          style={({ pressed }) => [styles.composerAdd, pressed && styles.pressed, (!quickTitle.trim() || mutateTask.isPending) && styles.disabled]}
        >
          <Text style={styles.composerAddText}>＋</Text>
        </Pressable>
      </View>

      <NativeFormModal
        visible={modal}
        title={editing ? text.edit : text.newTask}
        placeholder={text.newTask}
        value={title}
        secondaryValue={description}
        secondaryPlaceholder={text.description}
        dateValue={dueDate}
        datePlaceholder={text.due}
        valueMaxLength={160}
        secondaryMaxLength={2000}
        busy={mutateTask.isPending}
        error={mutateTask.error instanceof Error ? mutateTask.error.message : actionError}
        onChange={setTitle}
        onSecondaryChange={setDescription}
        onDateChange={setDueDate}
        onSave={() => void save()}
        onClose={() => setModal(false)}
        destructiveAction={
          editing
            ? { label: text.delete, onPress: () => confirmDelete(editing), busy: mutateTask.isPending }
            : undefined
        }
      >
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>{text.priority}</Text>
          <View style={styles.optionRow}>
            {priorities.map((item) => {
              const label = item === "high" ? text.high : item === "low" ? text.low : text.medium;
              return (
                <Pressable key={item} onPress={() => setPriority(item)} style={[styles.option, priority === item && styles.optionActive]}>
                  <Text style={[styles.optionText, priority === item && styles.optionTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>{text.project}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
            <Pressable onPress={() => setProjectId(null)} style={[styles.option, !projectId && styles.optionActive]}>
              <Text style={[styles.optionText, !projectId && styles.optionTextActive]}>{text.noProject}</Text>
            </Pressable>
            {projects.map((project) => (
              <Pressable key={project.id} onPress={() => setProjectId(project.id)} style={[styles.option, projectId === project.id && styles.optionActive]}>
                <Text numberOfLines={1} style={[styles.optionText, projectId === project.id && styles.optionTextActive]}>{project.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </NativeFormModal>
    </AppScreen>
  );
}

function TaskRow({
  task,
  projectTitle,
  text,
  locale,
  onToggle,
  onOpen,
  onEdit,
  onProject,
}: {
  task: Task;
  projectTitle?: string;
  text: (typeof copy)["pt-BR"] | (typeof copy)["en"];
  locale: "pt-BR" | "en";
  onToggle(): void;
  onOpen(): void;
  onEdit(): void;
  onProject?: () => void;
}) {
  const due = dueKey(task.dueDate);
  const today = localDay();
  const dueLabel = !due
    ? text.noDate
    : due < today
      ? text.overdue
      : due === today
        ? text.today
        : new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(new Date(`${due}T12:00:00`));
  const priorityLabel = task.priority === "high" ? text.high : task.priority === "low" ? text.low : text.medium;

  return (
    <View style={styles.taskCard}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: task.completed }} onPress={onToggle} style={[styles.check, task.completed && styles.checkDone]}>
        <Text style={styles.checkText}>{task.completed ? "✓" : ""}</Text>
      </Pressable>
      <Pressable onPress={onOpen} style={styles.taskCopy}>
        <Text numberOfLines={2} style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>{task.title}</Text>
        {task.description ? <Text numberOfLines={2} style={styles.taskDescription}>{task.description}</Text> : null}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{dueLabel}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{priorityLabel}</Text>
          {projectTitle ? (
            <Pressable onPress={onProject} style={styles.projectHit}>
              <Text numberOfLines={1} style={styles.projectMeta}>· {projectTitle}</Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={text.edit} onPress={onEdit} style={styles.moreButton}>
        <Text style={styles.moreText}>•••</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: 0, gap: spacing.sm, paddingBottom: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
  headerAdd: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerAddText: { color: colors.text, fontSize: 28, lineHeight: 30, fontWeight: "300" },
  filters: { gap: spacing.sm, paddingVertical: 4 },
  filter: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterActive: { backgroundColor: colors.text, borderColor: colors.text },
  filterText: { ...typography.label, color: colors.textMuted },
  filterTextActive: { color: colors.background },
  searchBox: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  searchIcon: { color: colors.textMuted, fontSize: 22 },
  searchInput: { ...typography.body, flex: 1, color: colors.text, paddingVertical: 0 },
  list: { gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  listEmpty: { flexGrow: 1 },
  taskCard: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  check: {
    width: 27,
    height: 27,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkDone: { backgroundColor: colors.primaryBright, borderColor: colors.primaryBright },
  checkText: { color: colors.background, fontWeight: "900" },
  taskCopy: { flex: 1, minWidth: 0 },
  taskTitle: { ...typography.heading, color: colors.text, fontSize: 17, lineHeight: 23 },
  taskTitleDone: { color: colors.textMuted, textDecorationLine: "line-through" },
  taskDescription: { ...typography.body, color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 5 },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, marginTop: 9 },
  meta: { ...typography.caption, color: colors.textMuted },
  metaDot: { ...typography.caption, color: colors.textMuted },
  projectHit: { maxWidth: 180 },
  projectMeta: { ...typography.caption, color: colors.textSecondary },
  moreButton: { minWidth: 40, minHeight: 40, alignItems: "center", justifyContent: "center" },
  moreText: { color: colors.textMuted, fontSize: 15, letterSpacing: 1 },
  starters: { gap: spacing.sm, paddingTop: spacing.lg },
  starterHeading: { ...typography.title, color: colors.text, fontSize: 23 },
  starterHint: { ...typography.body, color: colors.textMuted, marginBottom: spacing.sm },
  starterCard: {
    minHeight: 118,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: 17,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  starterTitle: { ...typography.heading, color: colors.text, fontSize: 16, lineHeight: 22 },
  starterDescription: { ...typography.body, color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 7 },
  plus: { color: colors.textMuted, fontSize: 27, lineHeight: 29 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 70 },
  emptyTitle: { ...typography.heading, color: colors.text },
  emptyHint: { ...typography.body, color: colors.textMuted, marginTop: 5, textAlign: "center" },
  composer: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 8,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  composerInput: { ...typography.body, flex: 1, minHeight: 52, color: colors.text, paddingHorizontal: spacing.sm },
  composerAdd: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: colors.text,
  },
  composerAddText: { color: colors.background, fontSize: 26, lineHeight: 28 },
  error: { ...typography.caption, color: colors.danger, textAlign: "center" },
  formSection: { gap: spacing.sm },
  formLabel: { ...typography.label, color: colors.textSecondary },
  optionRow: { flexDirection: "row", gap: spacing.sm },
  option: {
    minHeight: 38,
    maxWidth: 220,
    justifyContent: "center",
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  optionActive: { backgroundColor: colors.text, borderColor: colors.text },
  optionText: { ...typography.caption, color: colors.textMuted },
  optionTextActive: { color: colors.background, fontWeight: "700" },
});
