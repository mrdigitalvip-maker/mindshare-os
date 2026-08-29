import type { Project, Task } from "@/services/workspace-service";

export type TaskExecutionGroup = "overdue" | "today" | "upcoming" | "undated" | "completed";
export type TaskQueue = "now" | "today" | "overdue" | "upcoming" | "undated" | "completed" | "all";
export type TaskWorkState = "not_started" | "in_progress" | "blocked" | "completed";
export type TaskRhythmState =
  | "not_started"
  | "started_today"
  | "active_recently"
  | "stale"
  | "blocked"
  | "overdue"
  | "completed";

export const TASK_STALE_AFTER_DAYS = 3;
export const TASK_DUE_SOON_DAYS = 2;
const DAY_MS = 86_400_000;

const priorityLabels: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };
const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function getTaskPriorityLabel(priority: string) {
  const normalized = priority.trim().toLowerCase();
  return priorityLabels[normalized] ?? (priority.trim() || "Sem prioridade");
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizedDueDate(task: Task) {
  if (!task.dueDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(task.dueDate);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

/** Removes duplicate backend rows without hiding the first meaningful task. */
export function uniqueTasks(tasks: Task[]) {
  const seen = new Set<string>();
  return tasks.filter(
    (task) => Boolean(task.id) && !seen.has(task.id) && Boolean(seen.add(task.id)),
  );
}

export function getTaskExecutionState(task: Task, now = new Date()): TaskExecutionGroup {
  if (task.completed) return "completed";
  const due = normalizedDueDate(task);
  if (!due) return "undated";
  const today = dateKey(now);
  if (due < today) return "overdue";
  if (due === today) return "today";
  return "upcoming";
}

export function getTaskWorkState(task: Task): TaskWorkState {
  if (task.completed || task.executionStatus === "completed") return "completed";
  return task.executionStatus === "blocked" || task.executionStatus === "in_progress"
    ? task.executionStatus
    : "not_started";
}

export function getTaskNextActionState(task: Task) {
  return task.nextAction?.trim() ? ("defined" as const) : ("missing" as const);
}

export function getTaskStaleness(task: Task, now = new Date()) {
  if (getTaskWorkState(task) !== "in_progress" || !task.lastProgressAt) return null;
  const days = Math.floor((now.getTime() - new Date(task.lastProgressAt).getTime()) / DAY_MS);
  return Number.isFinite(days) && days >= TASK_STALE_AFTER_DAYS ? days : null;
}

function meaningfulDaysAgo(value: string | null | undefined, now: Date) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((now.getTime() - timestamp) / DAY_MS));
}

export function getTaskRhythmState(task: Task, now = new Date()): TaskRhythmState {
  const work = getTaskWorkState(task);
  if (work === "completed") return "completed";
  if (work === "blocked") return "blocked";
  if (getTaskExecutionState(task, now) === "overdue") return "overdue";
  if (work === "not_started") return "not_started";
  const progressDays = meaningfulDaysAgo(task.lastProgressAt, now);
  const startedDays = meaningfulDaysAgo(task.startedAt, now);
  if (progressDays === 0 || (progressDays === null && startedDays === 0)) return "started_today";
  if (progressDays !== null && progressDays < TASK_STALE_AFTER_DAYS) return "active_recently";
  return "stale";
}

export function getTaskProgressSummary(task: Task, now = new Date()) {
  const days = meaningfulDaysAgo(task.lastProgressAt, now);
  if (days === null) return null;
  return days === 0
    ? "Último progresso: hoje"
    : days === 1
      ? "Último progresso: ontem"
      : `Último progresso: há ${days} dias`;
}

export function getTaskNudge(task: Task, now = new Date()) {
  const work = getTaskWorkState(task);
  if (work === "completed") return "Esta tarefa foi concluída.";
  if (work === "blocked")
    return "Há um bloqueio registrado. Resolva-o ou redefina o caminho antes de continuar.";
  const deadline = getTaskExecutionState(task, now);
  if (deadline === "overdue")
    return "O prazo passou. Escolha entre concluir, reagendar ou redefinir o próximo passo.";
  if (deadline === "today") return "Esta tarefa vence hoje. Você quer avançar nela agora?";
  const stale = getTaskStaleness(task, now);
  if (stale) return `Esta tarefa está sem progresso há ${stale} dias. Retome com uma ação pequena.`;
  if (!task.nextAction?.trim()) return "Comece definindo o menor próximo passo.";
  if (!task.dueDate)
    return "Esta tarefa ainda não tem prazo. Definir quando ela precisa acontecer ajuda a priorizá-la.";
  return work === "in_progress"
    ? "Continue pela próxima ação definida."
    : "A próxima ação está clara. Comece quando estiver pronto.";
}

export function getTaskDuePresentation(task: Task, now = new Date()) {
  const due = normalizedDueDate(task);
  if (!due) return "Sem prazo";
  const today = dateKey(now);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (due < today) {
    const days = Math.round(
      (new Date(`${today}T12:00:00`).getTime() - new Date(`${due}T12:00:00`).getTime()) / DAY_MS,
    );
    return `Atrasada há ${days} ${days === 1 ? "dia" : "dias"}`;
  }
  if (due === today) return "Hoje";
  if (due === dateKey(tomorrow)) return "Amanhã";
  const days = Math.round(
    (new Date(`${due}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / DAY_MS,
  );
  if (days <= 30) return `Em ${days} dias`;
  const [, month, day] = due.split("-").map(Number);
  return `${day} ${months[month - 1]}`;
}

export function getTaskNotificationEligibility(task: Task, now = new Date()) {
  const deadline = getTaskExecutionState(task, now);
  const due = normalizedDueDate(task);
  const today = dateKey(now);
  const daysUntilDue = due
    ? Math.round(
        (new Date(`${due}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / DAY_MS,
      )
    : null;
  return {
    explicitReminder: Boolean(task.reminderAt),
    overdue: deadline === "overdue",
    staleInProgress: getTaskRhythmState(task, now) === "stale",
    unresolvedBlocker: getTaskWorkState(task) === "blocked",
    dueSoon: daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= TASK_DUE_SOON_DAYS,
  };
}

export function getTaskActivity(task: Task) {
  const events: { kind: "started" | "progress" | "completed"; at: string }[] = [];
  if (task.startedAt) events.push({ kind: "started", at: task.startedAt });
  if (task.lastProgressAt)
    events.push({ kind: task.completed ? "completed" : "progress", at: task.lastProgressAt });
  return events
    .filter(({ at }) => Number.isFinite(new Date(at).getTime()))
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Bounded, persisted context for the canonical Assistant. */
export function buildTaskAssistantContext(task: Task, project?: Project | null) {
  return [
    "Ajude-me a executar esta tarefa. Não altere dados sem Preview → Confirmar → Aplicar.",
    `Tarefa: ${task.title.slice(0, 160)}`,
    task.description?.trim() && `Descrição: ${task.description.trim().slice(0, 600)}`,
    `Estado: ${getTaskWorkState(task)}`,
    `Prioridade: ${getTaskPriorityLabel(task.priority)}`,
    `Prazo: ${task.dueDate ?? "sem prazo"}`,
    task.nextAction?.trim() && `Próxima ação: ${task.nextAction.trim().slice(0, 300)}`,
    task.blockerNote?.trim() && `Bloqueio: ${task.blockerNote.trim().slice(0, 300)}`,
    task.startedAt && `Iniciada em: ${task.startedAt}`,
    task.lastProgressAt && `Último progresso: ${task.lastProgressAt}`,
    project && `Projeto: ${project.title.slice(0, 160)}`,
    project?.description?.trim() &&
      `Objetivo do projeto: ${project.description.trim().slice(0, 400)}`,
    project?.dueDate && `Prazo do projeto: ${project.dueDate}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function sortTasksForExecution(tasks: Task[]) {
  return [...tasks].sort((left, right) => {
    const leftDue = normalizedDueDate(left) ?? "9999-99-99";
    const rightDue = normalizedDueDate(right) ?? "9999-99-99";
    return (
      leftDue.localeCompare(rightDue) ||
      (priorityRank[left.priority.toLowerCase()] ?? 3) -
        (priorityRank[right.priority.toLowerCase()] ?? 3) ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id)
    );
  });
}

export function groupTasksForExecution(tasks: Task[], now = new Date()) {
  const grouped: Record<TaskExecutionGroup, Task[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    undated: [],
    completed: [],
  };
  for (const task of uniqueTasks(tasks)) grouped[getTaskExecutionState(task, now)].push(task);
  for (const key of Object.keys(grouped) as TaskExecutionGroup[])
    grouped[key] = sortTasksForExecution(grouped[key]);
  return grouped;
}

/** Deterministic: overdue high priority, due today, active, nearest due, high undated, actionable. */
export function getFocusTask(tasks: Task[], now = new Date()) {
  const groups = groupTasksForExecution(tasks, now);
  const byPriority = (values: Task[]) =>
    [...values].sort((a, b) => {
      const priority =
        (priorityRank[a.priority.toLowerCase()] ?? 3) -
        (priorityRank[b.priority.toLowerCase()] ?? 3);
      if (priority) return priority;
      return sortTasksForExecution([a, b])[0].id === a.id ? -1 : 1;
    });
  const open = uniqueTasks(tasks).filter(
    (task) => !task.completed && getTaskWorkState(task) !== "blocked",
  );
  const actionableIds = new Set(open.map(({ id }) => id));
  const overdue = byPriority(groups.overdue.filter(({ id }) => actionableIds.has(id)));
  return (
    overdue.find((task) => task.priority.toLowerCase() === "high") ??
    overdue[0] ??
    byPriority(groups.today.filter(({ id }) => actionableIds.has(id)))[0] ??
    sortTasksForExecution(
      open.filter(
        (task) => Boolean(task.nextAction?.trim()) || getTaskWorkState(task) === "in_progress",
      ),
    )[0] ??
    byPriority(groups.upcoming.filter(({ id }) => actionableIds.has(id))).find(
      (task) => task.priority.toLowerCase() === "high",
    ) ??
    byPriority(groups.upcoming.filter(({ id }) => actionableIds.has(id)))[0] ??
    byPriority(groups.undated.filter(({ id }) => actionableIds.has(id)))[0] ??
    null
  );
}

export function getTasksForQueue(tasks: Task[], queue: TaskQueue, now = new Date()) {
  const groups = groupTasksForExecution(tasks, now);
  if (queue === "now") {
    const focus = getFocusTask(tasks, now);
    return focus ? [focus] : [];
  }
  if (queue === "all") return sortTasksForExecution(uniqueTasks(tasks));
  return groups[queue];
}

export function getTaskCounts(tasks: Task[], now = new Date()) {
  const groups = groupTasksForExecution(tasks, now);
  return {
    open:
      groups.overdue.length + groups.today.length + groups.upcoming.length + groups.undated.length,
    overdue: groups.overdue.length,
    today: groups.today.length,
    upcoming: groups.upcoming.length,
    undated: groups.undated.length,
    completed: groups.completed.length,
  };
}

export function getTaskAttentionSummary(tasks: Task[], projects: Project[] = [], now = new Date()) {
  const groups = groupTasksForExecution(tasks, now);
  const messages: string[] = [];
  const blocked = uniqueTasks(tasks).filter(
    (task) => !task.completed && getTaskWorkState(task) === "blocked" && task.blockerNote?.trim(),
  );
  if (blocked.length)
    messages.push(
      `${blocked.length} ${blocked.length === 1 ? "tarefa está bloqueada" : "tarefas estão bloqueadas"}.`,
    );
  if (groups.overdue.length)
    messages.push(
      `${groups.overdue.length} ${groups.overdue.length === 1 ? "tarefa está atrasada" : "tarefas estão atrasadas"}.`,
    );
  if (groups.today.length)
    messages.push(
      `${groups.today.length} ${groups.today.length === 1 ? "tarefa vence" : "tarefas vencem"} hoje.`,
    );
  const stale = uniqueTasks(tasks).filter((task) => getTaskRhythmState(task, now) === "stale");
  if (stale.length)
    messages.push(
      `${stale.length} ${stale.length === 1 ? "tarefa está sem progresso recente" : "tarefas estão sem progresso recente"}.`,
    );
  const loads = new Map<string, number>();
  for (const task of uniqueTasks(tasks))
    if (!task.completed && task.projectId)
      loads.set(task.projectId, (loads.get(task.projectId) ?? 0) + 1);
  const concentrated = [...loads].sort((a, b) => b[1] - a[1])[0];
  if (concentrated?.[1] >= 4) {
    const project = projects.find(({ id }) => id === concentrated[0]);
    if (project)
      messages.push(`O projeto “${project.title}” concentra ${concentrated[1]} tarefas pendentes.`);
  }
  if (groups.undated.length)
    messages.push(
      `${groups.undated.length === 1 ? "Há uma tarefa" : `Há ${groups.undated.length} tarefas`} sem prazo.`,
    );
  return messages.slice(0, 4);
}

export function getRescheduleDate(
  option: "later-today" | "tomorrow" | "three-days" | "next-week",
  now = new Date(),
) {
  const days =
    option === "later-today" ? 0 : option === "tomorrow" ? 1 : option === "three-days" ? 3 : 7;
  return dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
}

export function getTaskDisplayData(task: Task, projects: Project[]) {
  return { task, project: projects.find(({ id }) => id === task.projectId) ?? null };
}
