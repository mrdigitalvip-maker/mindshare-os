import { getOverdueTasks, getTodayTasks, getUpcomingTasks } from "@/lib/dashboard-selectors";
import type { Task } from "@/services/workspace-service";

export type TaskExecutionGroup = "overdue" | "today" | "upcoming" | "undated" | "completed";

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

export function getTaskExecutionState(task: Task, now = new Date()): TaskExecutionGroup {
  if (task.completed) return "completed";
  const due = normalizedDueDate(task);
  if (!due) return "undated";
  const today = dateKey(now);
  if (due < today) return "overdue";
  if (due === today) return "today";
  return "upcoming";
}

export function getTaskDuePresentation(task: Task, now = new Date()) {
  const due = normalizedDueDate(task);
  if (!due) return "Sem data";
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
    overdue: getOverdueTasks(tasks, now),
    today: getTodayTasks(tasks, now),
    upcoming: getUpcomingTasks(tasks, now),
    undated: tasks.filter((task) => getTaskExecutionState(task, now) === "undated"),
    completed: tasks.filter((task) => task.completed),
  };
  for (const key of Object.keys(grouped) as TaskExecutionGroup[])
    grouped[key] = sortTasksForExecution(grouped[key]);
  return grouped;
}
