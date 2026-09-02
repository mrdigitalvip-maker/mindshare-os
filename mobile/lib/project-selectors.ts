import { getOverdueTasks, getTodayTasks, getUpcomingTasks } from "@/lib/dashboard-selectors";
import type { Project, ProjectCheckIn, Task } from "@/services/workspace-service";
import { getDisplayProjectStatus } from "@/lib/presentation";

const completeStatuses = new Set(["completed", "archived"]);
const DAY = 86_400_000;
export const PROJECT_DUE_SOON_DAYS = 7;
export type ProjectHealthState =
  "on_track" | "attention" | "at_risk" | "blocked" | "overdue" | "completed" | "needs_plan";

const dayValue = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

export function getProjectDeadlineState(project: Project, now = new Date()) {
  if (completeStatuses.has(project.status.trim().toLowerCase())) return "completed" as const;
  const due = dayValue(project.dueDate);
  if (due === null) return "none" as const;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (due < today) return "overdue" as const;
  if (due === today) return "today" as const;
  if (due <= today + PROJECT_DUE_SOON_DAYS * DAY) return "approaching" as const;
  return "future" as const;
}

export const getProjectHealthLabel = (state: ProjectHealthState) =>
  ({
    on_track: "EM DIA",
    attention: "ATENÇÃO",
    at_risk: "ATENÇÃO",
    blocked: "BLOQUEADO",
    overdue: "ATENÇÃO",
    completed: "CONCLUÍDO",
    needs_plan: "PRECISA DE PLANO",
  })[state];

export function getProjectDeadlineSummary(project: Project, now = new Date()) {
  const due = dayValue(project.dueDate);
  if (due === null) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.round((due - today) / DAY);
  return {
    days,
    label:
      days < 0
        ? `${Math.abs(days)} ${Math.abs(days) === 1 ? "dia em atraso" : "dias em atraso"}`
        : days === 0
          ? "Prazo hoje"
          : `${days} ${days === 1 ? "dia restante" : "dias restantes"}`,
  };
}

export const getProjectBlockedTasks = (tasks: Task[]) =>
  tasks.filter(
    (task) =>
      !task.completed && (task.executionStatus === "blocked" || Boolean(task.blockerNote?.trim())),
  );

export function getProjectHealthState(
  project: Project,
  tasks: Task[],
  now = new Date(),
): ProjectHealthState {
  if (completeStatuses.has(project.status.trim().toLowerCase())) return "completed";
  if (getProjectDeadlineState(project, now) === "overdue") return "overdue";
  if (getProjectBlockedTasks(tasks).length) return "blocked";
  const overdue = getProjectOverdueTasks(tasks, now).length;
  if (overdue > 1 || (overdue && getProjectDeadlineState(project, now) === "approaching"))
    return "at_risk";
  if (
    overdue ||
    (getProjectDeadlineState(project, now) === "approaching" && getProjectOpenTaskCount(tasks))
  )
    return "attention";
  if (!tasks.length) return "needs_plan";
  return "on_track";
}

export function getProjectStudioNextAction(project: Project, tasks: Task[], now = new Date()) {
  if (completeStatuses.has(project.status.trim().toLowerCase())) return null;
  const blocked = getProjectBlockedTasks(tasks)[0];
  if (blocked) return { task: blocked, message: `Resolva o bloqueio da tarefa ${blocked.title}.` };
  const overdue = getProjectOverdueTasks(tasks, now);
  if (overdue.length > 1)
    return { task: overdue[0], message: `Priorize as ${overdue.length} tarefas atrasadas.` };
  const next = getProjectNextAction(tasks, now);
  if (next) return { task: next, message: `Finalize a tarefa ${next.title}.` };
  if (!tasks.length) return { task: null, message: "Defina a primeira ação deste projeto." };
  return null;
}

export function getProjectActivityState(
  tasks: Task[],
  checkIns: ProjectCheckIn[],
  now = new Date(),
) {
  const meaningful = [
    ...tasks.flatMap((task) => [task.lastProgressAt, task.startedAt].filter(Boolean) as string[]),
    ...checkIns.filter((item) => item.state === "progressed").map((item) => item.createdAt),
  ]
    .map((value) => new Date(value))
    .filter((value) => Number.isFinite(value.getTime()));
  if (!meaningful.length) return { state: "unknown" as const, days: null };
  const latest = meaningful.sort((a, b) => b.getTime() - a.getTime())[0];
  const days = Math.max(0, Math.floor((now.getTime() - latest.getTime()) / DAY));
  return {
    state:
      days === 0 ? ("today" as const) : days <= 7 ? ("this_week" as const) : ("inactive" as const),
    days,
  };
}

export const getLatestProjectCheckIn = (checkIns: ProjectCheckIn[]) =>
  [...checkIns].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

export function buildProjectAssistantContext(
  project: Project,
  tasks: Task[],
  checkIns: ProjectCheckIn[],
  now = new Date(),
) {
  const open = tasks.filter((task) => !task.completed).slice(0, 12);
  const latest = getLatestProjectCheckIn(checkIns);
  const progress = getProjectProgress(tasks);
  return [
    `Contexto verificado do projeto: ${project.title}`,
    project.objective
      ? `Objetivo: ${project.objective.slice(0, 500)}`
      : project.description
        ? `Descrição: ${project.description.slice(0, 500)}`
        : null,
    `Status: ${getDisplayProjectStatus(project.status)}`,
    project.dueDate ? `Prazo: ${project.dueDate.slice(0, 10)}` : null,
    progress
      ? `Progresso das tarefas: ${progress.completed}/${progress.total}`
      : "Sem tarefas cadastradas",
    `Tarefas abertas (${open.length} exibidas): ${open.map((task) => `${task.title}${task.blockerNote ? ` [bloqueio: ${task.blockerNote}]` : ""}`).join("; ") || "nenhuma"}`,
    `Atrasadas: ${getProjectOverdueTasks(tasks, now).length}; bloqueadas: ${getProjectBlockedTasks(tasks).length}`,
    latest
      ? `Último check-in (${getProjectCheckInLabel(latest.state)}): ${latest.note || "sem nota"}`
      : null,
    "Use Preview → Confirm → Apply para qualquer alteração; nunca faça escrita silenciosa.",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 3000);
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

export const getProjectCheckInLabel = (state: ProjectCheckIn["state"]) =>
  ({
    progressed: "Avancei",
    unchanged: "Sem mudança",
    blocked: "Estou bloqueado",
    reorganize: "Preciso reorganizar",
  })[state];

export function getProjectAttention(project: Project, tasks: Task[], now = new Date()) {
  if (completeStatuses.has(project.status.trim().toLowerCase())) return "Concluído";
  if (getProjectBlockedTasks(tasks).length) return "Bloqueado";
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
    Bloqueado: 0,
    Atrasado: 1,
    "Prazo vencido": 2,
    "Prazo próximo": 3,
    Hoje: 4,
    "Sem próxima tarefa": 5,
    "Em andamento": 6,
    Concluído: 7,
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
  const blocked = getProjectBlockedTasks(tasks).length;
  const open = getProjectOpenTaskCount(tasks);
  const deadline = getProjectDeadlineState(project, now);
  if (overdue)
    messages.push(
      `${overdue} ${overdue === 1 ? "tarefa está atrasada" : "tarefas estão atrasadas"}.`,
    );
  if (blocked)
    messages.push(
      `${blocked} ${blocked === 1 ? "tarefa está bloqueada" : "tarefas estão bloqueadas"}.`,
    );
  if (deadline === "overdue") messages.push("O prazo do projeto venceu.");
  else if (deadline === "approaching" && open)
    messages.push(
      `O prazo está próximo e ${open === 1 ? "há 1 tarefa aberta" : `ainda há ${open} tarefas abertas`}.`,
    );
  if (!getProjectNextAction(tasks, now))
    messages.push("Este projeto não possui uma próxima tarefa definida.");
  return messages;
}

export function getProjectsOverview(
  projects: Project[],
  tasksByProject: Map<string, Task[]>,
  now = new Date(),
) {
  const active = projects.filter((project) => !completeStatuses.has(project.status.toLowerCase()));
  return {
    attention: active.filter(
      (project) =>
        getProjectHealthSummary(project, tasksByProject.get(project.id) ?? [], now).length > 0,
    ).length,
    approaching: active.filter((project) => getProjectDeadlineState(project, now) === "approaching")
      .length,
    actionable: active.filter((project) =>
      Boolean(getProjectNextAction(tasksByProject.get(project.id) ?? [], now)),
    ).length,
  };
}
