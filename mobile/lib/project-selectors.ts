import {
  getOverdueTasks,
  getTodayTasks,
  getUpcomingTasks,
} from "@/lib/dashboard-selectors";
import type { Project, Task } from "@/services/workspace-service";

const completeStatuses = new Set(["completed", "archived"]);
const DAY = 86_400_000;
export const PROJECT_DUE_SOON_DAYS = 7;

const dayValue = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

export function getProjectDeadlineState(project: Project, now = new Date()) {
  if (completeStatuses.has(project.status.trim().toLowerCase())) return "none" as const;
  const due = dayValue(project.dueDate);
  if (due === null) return "none" as const;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (due < today) return "overdue" as const;
  if (due <= today + PROJECT_DUE_SOON_DAYS * DAY) return "approaching" as const;
  return "scheduled" as const;
}

export const getProjectOpenTaskCount = (tasks: Task[]) =>
  tasks.filter((task) => !task.completed).length;

export function groupTasksByProject(tasks: Task[]) {
  const grouped = new Map<string, Task[]>();
  const seen = new Set<string>();
  for (const task of tasks) {
    if (!task.projectId || seen.has(task.id)) continue;
    seen.add(task.id);
    grouped.set(task.projectId, [...(grouped.get(task.projectId) ?? []), task]);
  }
  return grouped;
}

export function getProjectProgress(tasks: Task[]) {
  if (!tasks.length) return null;
  const completed = tasks.filter((task) => task.completed).length;
  return { completed, total: tasks.length, ratio: completed / tasks.length };
}

export const getProjectOverdueTasks = (tasks: Task[], now = new Date()) =>
  getOverdueTasks(tasks, now);
export const getProjectTodayTasks = (tasks: Task[], now = new Date()) => getTodayTasks(tasks, now);

export function getProjectNextAction(tasks: Task[], now = new Date()) {
  return (
    getOverdueTasks(tasks, now)[0] ??
    getTodayTasks(tasks, now)[0] ??
    getUpcomingTasks(tasks, now)[0] ??
    tasks.find((task) => !task.completed && !task.dueDate) ??
    null
  );
}

export function getProjectTaskSections(tasks: Task[], now = new Date()) {
  const overdue = getOverdueTasks(tasks, now);
  const today = getTodayTasks(tasks, now);
  const upcoming = getUpcomingTasks(tasks, now);
  const undated = tasks.filter((task) => !task.completed && !task.dueDate);
  const completed = tasks.filter((task) => task.completed);
  return [
    { title: "Atenção", data: overdue },
    { title: "Hoje", data: today },
    { title: "Próximas", data: upcoming },
    { title: "Sem data", data: undated },
    { title: "Concluídas", data: completed },
  ].filter((section) => section.data.length);
}

export { getDisplayProjectStatus as getProjectStatusLabel } from "@/lib/presentation";

export function getProjectAttention(project: Project, tasks: Task[], now = new Date()) {
  if (completeStatuses.has(project.status.trim().toLowerCase())) return "Concluído";
  if (getOverdueTasks(tasks, now).length) return "Atrasado";
  if (getProjectDeadlineState(project, now) === "overdue") return "Prazo vencido";
  if (getProjectDeadlineState(project, now) === "approaching" && getProjectOpenTaskCount(tasks))
    return "Prazo próximo";
  if (getTodayTasks(tasks, now).length) return "Hoje";
  if (!getProjectNextAction(tasks, now)) return "Sem próxima tarefa";
  return "Em andamento";
}

export function sortProjectsByAttention(
  projects: Project[],
  tasksByProject: Map<string, Task[]>,
  now = new Date(),
) {
  const rank: Record<string, number> = {
    Atrasado: 0,
    "Prazo vencido": 1,
    "Prazo próximo": 2,
    Hoje: 3,
    "Sem próxima tarefa": 4,
    "Em andamento": 5,
    Concluído: 6,
  };
  return [...new Map(projects.map((project) => [project.id, project])).values()].sort((a, b) => {
    const difference =
      rank[getProjectAttention(a, tasksByProject.get(a.id) ?? [], now)] -
      rank[getProjectAttention(b, tasksByProject.get(b.id) ?? [], now)];
    return difference || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
}

export function getProjectHealthSummary(project: Project, tasks: Task[], now = new Date()) {
  if (completeStatuses.has(project.status.trim().toLowerCase())) return [];
  const messages: string[] = [];
  const overdue = getProjectOverdueTasks(tasks, now).length;
  const open = getProjectOpenTaskCount(tasks);
  const deadline = getProjectDeadlineState(project, now);
  if (overdue) messages.push(`${overdue} ${overdue === 1 ? "tarefa está atrasada" : "tarefas estão atrasadas"}.`);
  if (deadline === "overdue") messages.push("O prazo do projeto venceu.");
  else if (deadline === "approaching" && open)
    messages.push(`O prazo está próximo e ${open === 1 ? "há 1 tarefa aberta" : `ainda há ${open} tarefas abertas`}.`);
  if (!getProjectNextAction(tasks, now)) messages.push("Este projeto não possui uma próxima tarefa definida.");
  return messages;
}

export function getProjectsOverview(projects: Project[], tasksByProject: Map<string, Task[]>, now = new Date()) {
  const active = projects.filter((project) => !completeStatuses.has(project.status.toLowerCase()));
  return {
    attention: active.filter((project) => getProjectHealthSummary(project, tasksByProject.get(project.id) ?? [], now).length > 0).length,
    approaching: active.filter((project) => getProjectDeadlineState(project, now) === "approaching").length,
    actionable: active.filter((project) => Boolean(getProjectNextAction(tasksByProject.get(project.id) ?? [], now))).length,
  };
}
