import type { Project, Subject, Task } from "@/services/workspace-service";
import { getOverdueTasks, getTodayTasks } from "@/lib/dashboard-selectors";

export type DailyAction = {
  id: string;
  title: string;
  detail: string;
  href: "/productivity" | "/projects" | "/studies";
};

export type WeeklyChallenge = {
  key: string;
  type: "tasks";
  title: string;
  benefit: string;
  completed: number;
  target: number;
  href: "/productivity";
};

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Monday–Sunday local-calendar week key, anchored to that Monday. */
export function getWeekKey(date = new Date()) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = monday.getDay();
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
  return localDateKey(monday);
}

function isUpdatedInWeek(task: Task, now: Date) {
  if (!task.updatedAt) return false;
  const updated = new Date(task.updatedAt);
  if (Number.isNaN(updated.getTime())) return false;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return updated >= start && updated < end;
}

export function getDailyActions(
  tasks: Task[],
  projects: Project[],
  subjects: Subject[],
  now = new Date(),
): DailyAction[] {
  const actions: DailyAction[] = [];
  const overdue = getOverdueTasks(tasks, now);
  const today = getTodayTasks(tasks, now);
  if (overdue.length) {
    actions.push({
      id: "overdue",
      title: overdue.length === 1 ? `Concluir ${overdue[0].title}` : `Concluir ${overdue.length} tarefas atrasadas`,
      detail: "Comece pelo que já passou do prazo.",
      href: "/productivity",
    });
  }
  if (today.length) {
    actions.push({
      id: "today",
      title: today.length === 1 ? today[0].title : `${today.length} tarefas para hoje`,
      detail: "Prioridades com prazo de hoje.",
      href: "/productivity",
    });
  }
  const active = projects.find((project) => {
    const status = project.status.trim().toLowerCase();
    return !["completed", "archived"].includes(status) && !tasks.some((task) => task.projectId === project.id && !task.completed);
  });
  if (active) {
    actions.push({
      id: `project-${active.id}`,
      title: `Definir a próxima tarefa de ${active.title}`,
      detail: "Este projeto está sem uma próxima ação.",
      href: "/projects",
    });
  }
  const subject = subjects.find((item) => item.status.trim().toLowerCase() !== "archived");
  if (subject) {
    actions.push({
      id: `study-${subject.id}`,
      title: `Continuar ${subject.name}`,
      detail: "Retome uma matéria ativa.",
      href: "/studies",
    });
  }
  return actions.slice(0, 3);
}

/** Calculated from persisted tasks; no challenge state is stored locally. */
export function getWeeklyChallenge(tasks: Task[], userId: string, now = new Date()): WeeklyChallenge | null {
  const completed = tasks.filter((task) => task.completed && isUpdatedInWeek(task, now)).length;
  const measurable = completed + tasks.filter((task) => !task.completed).length;
  if (!userId.trim() || measurable < 3) return null;
  const target = Math.min(5, measurable);
  return {
    key: `${getWeekKey(now)}:${userId}:tasks`,
    type: "tasks",
    title: `Conclua ${target} tarefas nesta semana`,
    benefit: "Construa consistência e feche a semana com progresso real.",
    completed: Math.min(completed, target),
    target,
    href: "/productivity",
  };
}
