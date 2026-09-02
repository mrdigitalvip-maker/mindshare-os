import type { Project, Subject, Task } from "@/services/workspace-service";
import { getOverdueTasks, getTodayTasks } from "@/lib/dashboard-selectors";

export type DailyAction = {
  id: string;
  title: string;
  detail: string;
  href: "/productivity" | `/tasks/${string}` | `/projects/${string}` | `/studies/${string}`;
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

type DailyOptions = { excludeTaskId?: string | null };

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

function getWeekBounds(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function dueInWeek(task: Task, now: Date) {
  if (!task.dueDate) return false;
  const [year, month, day] = task.dueDate.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return false;
  const due = new Date(year, month - 1, day);
  const { start, end } = getWeekBounds(now);
  return due >= start && due < end;
}

function stableScore(value: string) {
  let score = 0;
  for (let index = 0; index < value.length; index += 1) {
    score = (score * 31 + value.charCodeAt(index)) >>> 0;
  }
  return score;
}

export function getDailyActions(
  tasks: Task[],
  projects: Project[],
  subjects: Subject[],
  now = new Date(),
  options: DailyOptions = {},
): DailyAction[] {
  const actions: DailyAction[] = [];
  const eligibleTasks = tasks.filter((task) => task.id !== options.excludeTaskId);
  const overdue = getOverdueTasks(eligibleTasks, now);
  const today = getTodayTasks(eligibleTasks, now);
  if (overdue.length) {
    actions.push({
      id: `task-${overdue[0].id}`,
      title: overdue[0].title,
      detail: "Comece pelo que já passou do prazo.",
      href: `/tasks/${overdue[0].id}`,
    });
  }
  if (today.length) {
    actions.push({
      id: `task-${today[0].id}`,
      title: today[0].title,
      detail: "Prioridades com prazo de hoje.",
      href: `/tasks/${today[0].id}`,
    });
  }
  const active = projects.find((project) => {
    const status = project.status.trim().toLowerCase();
    return (
      !["completed", "archived"].includes(status) &&
      !tasks.some((task) => task.projectId === project.id && !task.completed)
    );
  });
  if (active) {
    actions.push({
      id: `project-${active.id}`,
      title: `Definir a próxima ação de ${active.title}`,
      detail: "Este projeto está sem uma próxima ação.",
      href: `/projects/${active.id}`,
    });
  }
  const subject = subjects.find((item) => item.status.trim().toLowerCase() !== "archived");
  if (subject) {
    actions.push({
      id: `study-${subject.id}`,
      title: `Continuar ${subject.name}`,
      detail: "Retome uma matéria ativa.",
      href: `/studies/${subject.id}`,
    });
  }
  return actions.slice(0, 3);
}

/**
 * Uses the current completion state of a stable, due-this-week task cohort.
 * `updatedAt` is deliberately not treated as a completion timestamp.
 */
export function getWeeklyChallenge(
  tasks: Task[],
  userId: string,
  now = new Date(),
): WeeklyChallenge | null {
  if (!userId.trim()) return null;
  const weekKey = getWeekKey(now);
  const cohort = tasks
    .filter((task) => dueInWeek(task, now))
    .sort((left, right) => {
      const difference =
        stableScore(`${weekKey}:${userId}:${left.id}`) -
        stableScore(`${weekKey}:${userId}:${right.id}`);
      return difference || left.id.localeCompare(right.id);
    })
    .slice(0, 5);
  if (!cohort.length) return null;
  const target = cohort.length;
  const completed = cohort.filter((task) => task.completed).length;
  return {
    key: `${weekKey}:${userId}:tasks-due`,
    type: "tasks",
    title:
      target === 1
        ? "Conclua sua tarefa com prazo nesta semana"
        : `Conclua ${target} tarefas com prazo nesta semana`,
    benefit: "Reduza pendências e termine a semana com progresso visível.",
    completed,
    target,
    href: "/productivity",
  };
}
