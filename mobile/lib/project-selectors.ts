import {
  getOverdueTasks,
  getTodayTasks,
  getUpcomingTasks,
} from "@/lib/dashboard-selectors";
import type { Project, Task } from "@/services/workspace-service";

const completeStatuses = new Set(["completed", "archived"]);

export function groupTasksByProject(tasks: Task[]) {
  const grouped = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.projectId) continue;
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

export function getProjectStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Em andamento",
    paused: "Pausado",
    completed: "Concluído",
    archived: "Arquivado",
  };
  return labels[status.trim().toLowerCase()] ?? status;
}

export function getProjectAttention(project: Project, tasks: Task[], now = new Date()) {
  if (completeStatuses.has(project.status.trim().toLowerCase())) return "Concluído";
  if (getOverdueTasks(tasks, now).length) return "Atrasado";
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
    Hoje: 1,
    "Em andamento": 2,
    "Sem próxima tarefa": 3,
    Concluído: 4,
  };
  return [...projects].sort((a, b) => {
    const difference =
      rank[getProjectAttention(a, tasksByProject.get(a.id) ?? [], now)] -
      rank[getProjectAttention(b, tasksByProject.get(b.id) ?? [], now)];
    return difference || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
}
