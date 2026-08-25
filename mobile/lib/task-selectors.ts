import type { Project, Task } from "@/services/workspace-service";

export type TaskExecutionGroup = "overdue" | "today" | "upcoming" | "undated" | "completed";
export type TaskQueue = "now" | "today" | "overdue" | "upcoming" | "undated" | "completed" | "all";
export type TaskWorkState = "not_started" | "in_progress" | "blocked" | "completed";

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
  const days = Math.floor((now.getTime() - new Date(task.lastProgressAt).getTime()) / 86_400_000);
  return Number.isFinite(days) && days >= 3 ? days : null;
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
  if (due < today) return "Atrasada";
  if (due === today) return "Hoje";
  if (due === dateKey(tomorrow)) return "Amanhã";
  const [, month, day] = due.split("-").map(Number);
  return `${day} ${months[month - 1]}`;
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
  return (
    byPriority(groups.overdue)[0] ??
    byPriority(groups.today)[0] ??
    tasks.find((task) => !task.completed && getTaskWorkState(task) === "in_progress") ??
    groups.upcoming.find((task) => task.priority.toLowerCase() === "high") ??
    groups.upcoming[0] ??
    groups.undated[0] ??
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
  if (groups.overdue.length)
    messages.push(
      `${groups.overdue.length} ${groups.overdue.length === 1 ? "tarefa está atrasada" : "tarefas estão atrasadas"}.`,
    );
  if (groups.today.length)
    messages.push(
      `${groups.today.length} ${groups.today.length === 1 ? "tarefa vence" : "tarefas vencem"} hoje.`,
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
  return messages;
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
