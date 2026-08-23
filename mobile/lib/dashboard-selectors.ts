import type { Project, Task } from "@/services/workspace-service";

export function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dueDateKey(value: string | null) {
  if (!value) return null;
  const dateOnly = /^(\d{4}-\d{2}-\d{2})(?:$|T)/.exec(value);
  if (dateOnly && value.length === 10) return dateOnly[1];
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : localDateKey(parsed);
}

function byDueDate(a: Task, b: Task) {
  return (
    (dueDateKey(a.dueDate) ?? "").localeCompare(dueDateKey(b.dueDate) ?? "") ||
    a.title.localeCompare(b.title) ||
    a.id.localeCompare(b.id)
  );
}

export function getOverdueTasks(tasks: Task[], now = new Date()) {
  const today = localDateKey(now);
  return tasks
    .filter(
      (task) =>
        !task.completed && Boolean(dueDateKey(task.dueDate)) && dueDateKey(task.dueDate)! < today,
    )
    .sort(byDueDate);
}

export function getTodayTasks(tasks: Task[], now = new Date()) {
  const today = localDateKey(now);
  return tasks
    .filter((task) => !task.completed && dueDateKey(task.dueDate) === today)
    .sort(byDueDate);
}

export function getHomeDaySummary(tasks: Task[], now = new Date()) {
  const today = localDateKey(now);
  const dueToday = tasks.filter((task) => dueDateKey(task.dueDate) === today);
  const completed = dueToday.filter((task) => task.completed).length;
  const pending = dueToday.length - completed;
  return {
    completed,
    pending,
    total: dueToday.length,
    overdue: getOverdueTasks(tasks, now).length,
    percentage: dueToday.length ? Math.round((completed / dueToday.length) * 100) : null,
  };
}

export function getHomeContextMessage(
  summary: Pick<ReturnType<typeof getHomeDaySummary>, "overdue" | "pending">,
  hasActionableTask: boolean,
) {
  if (summary.overdue > 0) return "Vamos tirar uma pendência do caminho.";
  if (summary.pending > 0)
    return `Você tem ${summary.pending} ${summary.pending === 1 ? "prioridade" : "prioridades"} para hoje.`;
  if (!hasActionableTask) return "Vamos definir o próximo passo.";
  return "Seu dia está sob controle.";
}

export function getUpcomingTasks(tasks: Task[], now = new Date()) {
  const today = localDateKey(now);
  return tasks
    .filter(
      (task) =>
        !task.completed && Boolean(dueDateKey(task.dueDate)) && dueDateKey(task.dueDate)! > today,
    )
    .sort(byDueDate);
}

export function getNextAction(tasks: Task[], now = new Date()) {
  return (
    getOverdueTasks(tasks, now)[0] ??
    getTodayTasks(tasks, now)[0] ??
    getUpcomingTasks(tasks, now)[0] ??
    null
  );
}

export function getTaskPreviews(tasks: Task[], now = new Date(), limit = 3) {
  return [
    ...getOverdueTasks(tasks, now),
    ...getTodayTasks(tasks, now),
    ...getUpcomingTasks(tasks, now),
  ].slice(0, limit);
}

export function getProjectProgress(projectId: string, tasks: Task[]) {
  const projectTasks = tasks.filter((task) => task.projectId === projectId);
  if (!projectTasks.length) return null;
  const completed = projectTasks.filter((task) => task.completed).length;
  return {
    completed,
    total: projectTasks.length,
    percentage: Math.round((completed / projectTasks.length) * 100),
  };
}

export function getActiveProjects(projects: Project[], limit = 3) {
  const activeStatuses = new Set(["active", "open", "in_progress", "in progress", "em andamento"]);
  return projects
    .filter((project) => activeStatuses.has(project.status.trim().toLowerCase()))
    .slice(0, limit);
}

export function getHomeProjects(projects: Project[], tasks: Task[], now = new Date(), limit = 3) {
  const activeStatuses = new Set([
    "active",
    "open",
    "in_progress",
    "in progress",
    "em andamento",
  ]);
  const today = localDateKey(now);
  const ranks = new Map<string, number>();
  for (const task of tasks) {
    if (!task.projectId) continue;
    const due = dueDateKey(task.dueDate);
    const rank = task.completed ? 3 : due && due < today ? 0 : due === today ? 1 : 2;
    ranks.set(task.projectId, Math.min(ranks.get(task.projectId) ?? 4, rank));
  }
  return projects
    .filter((project) => activeStatuses.has(project.status.trim().toLowerCase()))
    .sort(
      (a, b) =>
        (ranks.get(a.id) ?? 4) - (ranks.get(b.id) ?? 4) ||
        a.title.localeCompare(b.title) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, Math.max(0, limit));
}

export function getDueLabel(task: Task, now = new Date()) {
  const key = dueDateKey(task.dueDate);
  if (!key) return "Sem prazo";
  const today = localDateKey(now);
  if (key < today) return `Atrasada · ${key.split("-").reverse().join("/")}`;
  if (key === today) return "Hoje";
  return key.split("-").reverse().join("/");
}
