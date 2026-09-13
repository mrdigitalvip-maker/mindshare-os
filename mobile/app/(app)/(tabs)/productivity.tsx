import { useMemo, useRef, useState } from "react";
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
import { colors, radius, shadows, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";
import type { Task } from "@/services/workspace-service";
import { cancelTaskReminder } from "@/services/notification-service";

type FilterKey = "now" | "today" | "overdue" | "upcoming" | "undated" | "completed" | "all";
const filters: FilterKey[] = ["now", "today", "overdue", "upcoming", "undated", "completed", "all"];
const priorities = ["high", "medium", "low"] as const;

const copy = {
  "pt-BR": {
    title: "Tarefas",
    subtitle: "Execute o que move seu sistema agora.",
    newTask: "+ Nova",
    execution: "EXECUTION SYSTEM",
    overdue: "atrasadas",
    today: "hoje",
    open: "em aberto",
    focus: "FOCO AGORA",
    openTask: "Abrir tarefa",
    complete: "Concluir",
    postpone: "Adiar",
    intelligence: "INTELIGÊNCIA KIVRYN",
    intelligenceCopy: "A KIVRYN lê prioridade, prazo, projeto, bloqueios e ritmo para decidir o próximo movimento.",
    organize: "Organizar meu dia",
    unblock: "Destravar meu trabalho",
    live: "SISTEMA VIVO",
    liveCopy: "Tarefas atualizam Projetos, Dashboard, missões e o contexto do KIVRYN Core em todo o app.",
    calendar: "CALENDAR READY",
    calendarCopy: "Lembretes já funcionam no dispositivo. Google Calendar entra aqui quando o Connections Hub estiver conectado, sem duplicar prazos.",
    queue: "FILA DE EXECUÇÃO",
    syncing: "Sincronizando…",
    updated: "Atualizado",
    pending: "Atualização pendente",
    filters: {
      now: "Agora",
      today: "Hoje",
      overdue: "Atrasadas",
      upcoming: "Próximas",
      undated: "Sem prazo",
      completed: "Concluídas",
      all: "Todas",
    },
  },
  en: {
    title: "Tasks",
    subtitle: "Execute what moves your system now.",
    newTask: "+ New",
    execution: "EXECUTION SYSTEM",
    overdue: "overdue",
    today: "today",
    open: "open",
    focus: "FOCUS NOW",
    openTask: "Open task",
    complete: "Complete",
    postpone: "Postpone",
    intelligence: "KIVRYN INTELLIGENCE",
    intelligenceCopy: "KIVRYN reads priority, deadline, project, blockers and rhythm to choose the next move.",
    organize: "Organize my day",
    unblock: "Unblock my work",
    live: "LIVE SYSTEM",
    liveCopy: "Tasks update Projects, Dashboard, missions and KIVRYN Core context across the app.",
    calendar: "CALENDAR READY",
    calendarCopy: "Device reminders already work. Google Calendar plugs in here when Connections Hub is connected, without duplicating deadlines.",
    queue: "EXECUTION QUEUE",
    syncing: "Syncing…",
    updated: "Updated",
    pending: "Update pending",
    filters: {
      now: "Now",
      today: "Today",
      overdue: "Overdue",
      upcoming: "Upcoming",
      undated: "No date",
      completed: "Completed",
      all: "All",
    },
  },
} as const;

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function Productivity() {
  const router = useRouter();
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const tasksQuery = useTasks();
  const projectsQuery = useProjects();
  const { mutateTask } = useWorkspaceMutations();
  const [filter, setFilter] = useState<FilterKey>("now");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const pendingIdsRef = useRef(new Set<string>());
  const saveGuard = useRef(false);
  const deleteGuard = useRef(new Set<string>());
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
    const data = getTasksForQueue(tasks, filter as TaskQueue);
    return data.length ? [{ key: filter, title: text.filters[filter], data }] : [];
  }, [filter, tasks, text.filters]);

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
    setDueDate(task?.dueDate?.slice(0, 10) ?? (filter === "today" ? localDate() : ""));
    setPriority(task?.priority ?? "medium");
    setProjectId(task?.projectId ?? null);
    setModal(true);
  }

  function askKivryn(prompt: string) {
    router.push({ pathname: "/assistant-chat", params: { prompt } });
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
    if (saveGuard.current || mutateTask.isPending) return;
    saveGuard.current = true;
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
      // Keep the form intact for correction/retry.
    } finally {
      saveGuard.current = false;
    }
  }

  async function toggle(task: Task) {
    if (pendingIdsRef.current.has(task.id)) return;
    pendingIdsRef.current.add(task.id);
    setActionError(null);
    setPendingIds((current) => new Set(current).add(task.id));
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
      setActionError("Não foi possível atualizar a tarefa.");
    } finally {
      pendingIdsRef.current.delete(task.id);
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
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
          if (deleteGuard.current.has(task.id)) return;
          deleteGuard.current.add(task.id);
          void mutateTask
            .mutateAsync({ action: "delete", taskId: task.id, projectId: task.projectId })
            .then(() => cancelTaskReminder(task.id))
            .then(() => setModal(false))
            .catch(() => setActionError("Não foi possível excluir a tarefa."))
            .finally(() => deleteGuard.current.delete(task.id));
        },
      },
    ]);
  }

  const emptyCopy =
    filter === "today"
      ? "Nada previsto para hoje."
      : filter === "overdue"
        ? "Nenhuma tarefa atrasada."
        : filter === "completed"
          ? "Nenhuma tarefa concluída."
          : filter === "now"
            ? "Seu espaço de execução está livre."
            : `Nenhuma tarefa em ${text.filters[filter].toLowerCase()}.`;

  return (
    <AppScreen contentContainerStyle={styles.page}>
      <StandardHeader
        title={text.title}
        subtitle={text.subtitle}
        action={
          <Pressable accessibilityRole="button" onPress={() => openEditor()} style={styles.add}>
            <Text style={styles.addText}>{text.newTask}</Text>
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
            tintColor={colors.primaryBright}
            colors={[colors.primaryBright]}
            refreshing={tasksQuery.isRefetching || projectsQuery.isRefetching}
            onRefresh={() => void Promise.all([tasksQuery.refetch(), projectsQuery.refetch()])}
          />
        }
        contentContainerStyle={sections.length ? styles.list : styles.empty}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <Text accessibilityLiveRegion="polite" style={styles.syncState}>
              {tasksQuery.isRefetching || projectsQuery.isRefetching
                ? text.syncing
                : tasksQuery.dataUpdatedAt
                  ? `${text.updated} ${new Date(tasksQuery.dataUpdatedAt).toLocaleTimeString(resolvedLocale, { hour: "2-digit", minute: "2-digit" })}`
                  : text.pending}
            </Text>

            <View style={styles.commandCard}>
              <View style={styles.glowA} />
              <View style={styles.glowB} />
              <Text style={styles.commandEyebrow}>{text.execution}</Text>
              <View style={styles.metricsRow}>
                <Metric value={counts.overdue} label={text.overdue} danger={counts.overdue > 0} />
                <View style={styles.divider} />
                <Metric value={counts.today} label={text.today} />
                <View style={styles.divider} />
                <Metric value={counts.open} label={text.open} />
              </View>
            </View>

            {focus ? (
              <View style={styles.focusCard}>
                <Text style={styles.eyebrow}>{text.focus}</Text>
                <Text numberOfLines={2} style={styles.focusTitle}>{focus.title}</Text>
                <Text style={styles.focusMeta}>
                  {getTaskDuePresentation(focus)} · {getTaskPriorityLabel(focus.priority)}
                </Text>
                {projectTitles.get(focus.projectId ?? "") ? (
                  <Text style={styles.focusProject}>◇ {projectTitles.get(focus.projectId!)}</Text>
                ) : null}
                <View style={styles.focusActions}>
                  <Pressable onPress={() => router.push(`/tasks/${focus.id}`)} style={styles.primaryButton}>
                    <Text style={styles.primaryText}>{text.openTask}</Text>
                  </Pressable>
                  <Pressable onPress={() => void toggle(focus)} style={styles.primaryButton}>
                    <Text style={styles.primaryText}>{text.complete}</Text>
                  </Pressable>
                  <Pressable onPress={() => reschedule(focus)} style={styles.secondaryButton}>
                    <Text style={styles.secondaryText}>{text.postpone}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View style={styles.aiCard}>
              <View style={styles.aiIcon}><Text style={styles.aiSpark}>✦</Text></View>
              <View style={styles.flex}>
                <Text style={styles.eyebrow}>{text.intelligence}</Text>
                <Text style={styles.bodyMuted}>{text.intelligenceCopy}</Text>
              </View>
              <View style={styles.aiActions}>
                <Pressable
                  onPress={() => askKivryn("Analise minhas tarefas atuais e organize meu dia por impacto, urgência, projeto e bloqueios. Proponha as mudanças necessárias, mas só aplique depois da minha confirmação.")}
                  style={styles.primaryPill}
                >
                  <Text style={styles.primaryPillText}>{text.organize}</Text>
                </Pressable>
                <Pressable
                  onPress={() => askKivryn("Analise minhas tarefas bloqueadas, atrasadas e sem próxima ação. Diga o que está travando meu trabalho e proponha como destravar agora.")}
                  style={styles.secondaryPill}
                >
                  <Text style={styles.secondaryPillText}>{text.unblock}</Text>
                </Pressable>
              </View>
            </View>

            {attention.length ? (
              <View style={styles.attention}>
                <Text style={styles.eyebrow}>SINAIS DO SISTEMA</Text>
                {attention.slice(0, 3).map((message) => (
                  <Text key={message} style={styles.attentionText}>• {message}</Text>
                ))}
              </View>
            ) : null}

            <View style={styles.liveCard}>
              <Text style={styles.eyebrow}>{text.live}</Text>
              <Text style={styles.bodyMuted}>{text.liveCopy}</Text>
            </View>

            <View style={styles.calendarCard}>
              <View style={styles.calendarGlyph}><Text style={styles.calendarGlyphText}>◷</Text></View>
              <View style={styles.flex}>
                <Text style={styles.eyebrow}>{text.calendar}</Text>
                <Text style={styles.bodyMuted}>{text.calendarCopy}</Text>
              </View>
            </View>

            {actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text> : null}
            {projectsQuery.isError ? (
              <Pressable onPress={() => void projectsQuery.refetch()}>
                <Text style={styles.error}>Não foi possível atualizar os projetos vinculados. Tentar novamente.</Text>
              </Pressable>
            ) : null}

            <Text style={styles.sectionEyebrow}>{text.queue}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {filters.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: item === filter }}
                  key={item}
                  onPress={() => setFilter(item)}
                  style={[styles.filter, item === filter && styles.activeFilter]}
                >
                  <Text style={[styles.filterText, item === filter && styles.activeText]}>
                    {text.filters[item]}
                    {item === "today" && counts.today ? ` ${counts.today}` : item === "overdue" && counts.overdue ? ` ${counts.overdue}` : ""}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={<EmptyState title={emptyCopy} actionLabel="Nova tarefa" onAction={() => openEditor()} />}
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
            onEdit={() => router.push(`/tasks/${item.id}`)}
            onProject={item.projectId ? () => router.push(`/projects/${item.projectId}`) : undefined}
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
        datePlaceholder="Prazo (opcional)"
        valueMaxLength={160}
        secondaryMaxLength={2000}
        busy={mutateTask.isPending}
        error={mutateTask.error?.message}
        errorMessage={editing ? "Não foi possível atualizar a tarefa." : "Não foi possível criar a tarefa."}
        onChange={setTitle}
        onSecondaryChange={setDescription}
        onDateChange={setDueDate}
        onClose={() => setModal(false)}
        onSave={() => void save()}
        destructiveAction={editing ? { label: "Excluir tarefa", busy: mutateTask.isPending, onPress: () => confirmDelete(editing) } : undefined}
      >
        <Picker label="Prioridade">
          {priorities.map((value) => (
            <PickerChip key={value} label={getTaskPriorityLabel(value)} selected={priority === value} onPress={() => setPriority(value)} />
          ))}
        </Picker>
        <Picker label="Projeto">
          <PickerChip label="Sem projeto" selected={!projectId} onPress={() => setProjectId(null)} />
          {(projectsQuery.data ?? []).map((project) => (
            <PickerChip key={project.id} label={project.title} selected={projectId === project.id} onPress={() => setProjectId(project.id)} />
          ))}
        </Picker>
      </NativeFormModal>
    </AppScreen>
  );
}

function Metric({ value, label, danger }: { value: number; label: string; danger?: boolean }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, danger && styles.danger]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Picker({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.picker}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerOptions}>{children}</ScrollView>
    </View>
  );
}

function PickerChip({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.pickerChip, selected && styles.activeFilter]}>
      <Text numberOfLines={1} style={[styles.filterText, selected && styles.activeText]}>{label}</Text>
    </Pressable>
  );
}

function TaskRow({ task, projectTitle, pending, onToggle, onEdit, onProject }: { task: Task; projectTitle?: string; pending: boolean; onToggle(): void; onEdit(): void; onProject?: () => void }) {
  const state = getTaskExecutionState(task);
  return (
    <View style={[styles.task, state === "overdue" && styles.overdueTask, state === "completed" && styles.completedTask]}>
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
      <Pressable accessibilityRole="button" onPress={onEdit} style={({ pressed }) => [styles.taskMain, pressed && styles.pressed]}>
        <Text numberOfLines={2} style={[styles.taskTitle, task.completed && styles.done]}>{task.title}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.due, state === "overdue" && styles.danger]}>{getTaskDuePresentation(task)}</Text>
          {projectTitle ? (
            <Pressable accessibilityRole="link" onPress={onProject} hitSlop={10}>
              <Text numberOfLines={1} style={styles.project}>◇ {projectTitle}</Text>
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
  flex: { flex: 1 },
  add: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  addText: { ...typography.label, color: colors.text },
  headerContent: { gap: spacing.md, paddingBottom: spacing.sm },
  syncState: { ...typography.caption, color: colors.textMuted },
  commandCard: { position: "relative", overflow: "hidden", padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.card },
  glowA: { position: "absolute", width: 150, height: 150, borderRadius: 75, right: -45, top: -70, backgroundColor: colors.accentMuted, opacity: 0.45 },
  glowB: { position: "absolute", width: 110, height: 110, borderRadius: 55, left: -40, bottom: -70, backgroundColor: colors.primary, opacity: 0.08 },
  commandEyebrow: { ...typography.eyebrow, color: colors.primaryBright, marginBottom: spacing.md },
  metricsRow: { flexDirection: "row", alignItems: "center" },
  metric: { flex: 1, alignItems: "center" },
  metricValue: { ...typography.title, color: colors.text },
  metricLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  divider: { width: StyleSheet.hairlineWidth, height: 38, backgroundColor: colors.border },
  danger: { color: colors.danger },
  focusCard: { padding: spacing.lg, gap: spacing.xs, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primaryBright, backgroundColor: colors.surfaceRaised, ...shadows.card },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  focusTitle: { ...typography.heading, fontSize: 20, lineHeight: 26, color: colors.text, marginTop: spacing.xs },
  focusMeta: { ...typography.caption, color: colors.textMuted },
  focusProject: { ...typography.caption, color: colors.primaryBright },
  focusActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  primaryButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  primaryText: { ...typography.label, color: colors.text },
  secondaryButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  secondaryText: { ...typography.label, color: colors.primaryBright },
  aiCard: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  aiIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentMuted },
  aiSpark: { color: colors.primaryBright, fontSize: 20 },
  bodyMuted: { ...typography.body, color: colors.textMuted },
  aiActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  primaryPill: { minHeight: 42, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.primary },
  primaryPillText: { ...typography.label, color: colors.text },
  secondaryPill: { minHeight: 42, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  secondaryPillText: { ...typography.label, color: colors.primaryBright },
  attention: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  attentionText: { ...typography.caption, color: colors.textMuted },
  liveCard: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised },
  calendarCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  calendarGlyph: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised },
  calendarGlyphText: { color: colors.primaryBright, fontSize: 22 },
  error: { ...typography.label, color: colors.danger },
  sectionEyebrow: { ...typography.eyebrow, color: colors.textMuted, marginTop: spacing.sm },
  filters: { gap: spacing.sm, paddingVertical: spacing.xs },
  filter: { height: 42, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface },
  activeFilter: { backgroundColor: colors.primary },
  filterText: { ...typography.label, color: colors.textMuted },
  activeText: { color: colors.text },
  list: { paddingBottom: spacing.xl },
  empty: { flexGrow: 1 },
  sectionTitle: { ...typography.eyebrow, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm },
  sectionCount: { color: colors.primaryBright },
  task: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm, marginBottom: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  overdueTask: { borderLeftWidth: 3, borderLeftColor: colors.danger },
  completedTask: { opacity: 0.62 },
  checkbox: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, borderWidth: 1, borderColor: colors.textMuted },
  checked: { borderColor: colors.success, backgroundColor: colors.success },
  checkText: { ...typography.label, color: colors.background },
  taskMain: { flex: 1, minWidth: 0, paddingVertical: spacing.sm },
  pressed: { opacity: 0.65 },
  taskTitle: { ...typography.body, color: colors.text },
  done: { textDecorationLine: "line-through", color: colors.textMuted },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 3 },
  due: { ...typography.caption, color: colors.textMuted },
  project: { ...typography.caption, color: colors.primaryBright, flexShrink: 1 },
  priority: { ...typography.caption, color: colors.textMuted },
  chevron: { fontSize: 22, color: colors.textMuted },
  picker: { gap: spacing.xs },
  pickerLabel: { ...typography.label, color: colors.text },
  pickerOptions: { gap: spacing.sm },
  pickerChip: { height: 42, maxWidth: 180, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
});