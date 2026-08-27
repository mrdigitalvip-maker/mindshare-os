import type { Project, Subject, Task } from "@/services/workspace-service";

export type JourneyCategory =
  "creator" | "business" | "fitness" | "study" | "travel" | "personal" | "custom";
export type JourneyStatus = "active" | "paused" | "completed" | "archived";
export type MissionSourceType = "task" | "study_session" | "project" | "journey_action";
export type MissionStatus = "pending" | "active" | "completed" | "skipped";
export type Journey = {
  id: string;
  title: string;
  category: JourneyCategory;
  objective: string;
  context: string | null;
  status: JourneyStatus;
  startDate: string;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
};
export type JourneyMission = {
  id: string;
  journeyId: string | null;
  sourceType: MissionSourceType;
  sourceId: string;
  title: string;
  description: string | null;
  status: MissionStatus;
  scheduledDate: string;
  momentumValue: number;
  completedAt: string | null;
  createdAt: string;
};
export type MomentumEvent = {
  id: string;
  journeyId: string | null;
  sourceType: string;
  sourceId: string;
  eventType: string;
  points: number;
  createdAt: string;
};
export type MomentumSummary = {
  totalPoints: number;
  weekPoints: number;
  completedMissions: number;
  streak: number;
  recentEvents: MomentumEvent[];
};
export type WeeklyChallenge = {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  rewardPoints: number;
  progress: number;
  completedAt: string | null;
  startsAt: string;
  endsAt: string;
};
export type MissionCandidate = {
  sourceType: MissionSourceType;
  sourceId: string;
  title: string;
  description: string | null;
  rank: number;
};

export type MissionExecutionTarget = {
  href: `/tasks/${string}` | `/studies/${string}` | `/projects/${string}` | `/journeys/${string}`;
  label: "Começar" | "Continuar" | "Ver ação" | "Concluída";
  canCompleteDirectly: boolean;
};

export const JOURNEY_TEMPLATES = [
  { category: "creator" as const, label: "Creator", title: "Criar com consistência" },
  { category: "business" as const, label: "Negócios", title: "Tirar minha oferta do papel" },
  { category: "fitness" as const, label: "Fitness", title: "Voltar a me movimentar" },
  { category: "study" as const, label: "Estudos", title: "Estudar com consistência" },
  { category: "travel" as const, label: "Viagem", title: "Preparar minha próxima viagem" },
  { category: "personal" as const, label: "Pessoal", title: "Mover um objetivo pessoal" },
] as const;

export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
export function selectDailyMission(
  tasks: Task[],
  projects: Project[],
  subjects: Subject[],
  now: Date,
): MissionCandidate | null {
  const today = localDateKey(now);
  const activeProjects = new Set(
    projects.filter((p) => p.status.toLowerCase() === "active").map((p) => p.id),
  );
  const candidates: MissionCandidate[] = tasks
    .filter((t) => !t.completed && (!t.projectId || activeProjects.has(t.projectId)))
    .map((task) => {
      const due = task.dueDate?.slice(0, 10) ?? null;
      const impact =
        task.priority.toLowerCase() === "high"
          ? 0
          : task.priority.toLowerCase() === "medium"
            ? 2
            : 4;
      const rank =
        due && due < today
          ? impact
          : due === today
            ? 10 + impact
            : task.executionStatus === "in_progress"
              ? 30 + impact
              : due
                ? 50 + impact
                : task.nextAction
                  ? 70 + impact
                  : 90 + impact;
      return {
        sourceType: "task" as const,
        sourceId: task.id,
        title: task.title,
        description: task.nextAction || task.description || null,
        rank,
      };
    });
  subjects
    .filter((s) => s.status.toLowerCase() === "active" && s.nextAction)
    .forEach((subject) =>
      candidates.push({
        sourceType: "study_session",
        sourceId: subject.id,
        title: `Estudar ${subject.name}`,
        description: subject.nextAction || null,
        rank: 40,
      }),
    );
  candidates.sort(
    (a, b) =>
      a.rank - b.rank || a.title.localeCompare(b.title) || a.sourceId.localeCompare(b.sourceId),
  );
  return candidates[0] ?? null;
}
export function stableMission(
  existing: JourneyMission | null,
  candidate: MissionCandidate | null,
  day: string,
) {
  if (
    existing &&
    existing.scheduledDate === day &&
    !["skipped", "completed"].includes(existing.status)
  )
    return existing;
  return candidate;
}
export function calculateStreak(eventDates: string[], today: Date): number {
  const days = new Set(eventDates.map((value) => value.slice(0, 10)));
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
export function startOfLocalWeek(date: Date): Date {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  value.setDate(value.getDate() - (value.getDay() === 0 ? 6 : value.getDay() - 1));
  return value;
}
export function summarizeMomentum(events: MomentumEvent[], now: Date): MomentumSummary {
  const owned = [...new Map(events.map((event) => [event.id, event])).values()];
  const week = startOfLocalWeek(now).getTime();
  const through = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const weekly = owned.filter((event) => {
    const at = new Date(event.createdAt).getTime();
    return Number.isFinite(at) && at >= week && at < through;
  });
  const verifiedDays = owned
    .filter((event) => event.eventType === "mission_completed")
    .map((event) => event.createdAt);
  return {
    totalPoints: owned.reduce((total, event) => total + event.points, 0),
    weekPoints: weekly.reduce((total, event) => total + event.points, 0),
    completedMissions: weekly.filter((event) => event.eventType === "mission_completed").length,
    streak: calculateStreak(verifiedDays, now),
    recentEvents: owned.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
  };
}
export const getActiveJourney = (journeys: Journey[]) =>
  journeys.find((journey) => journey.status === "active") ?? null;
export const getTodayMission = (mission: JourneyMission | null | undefined) =>
  mission && !["completed", "skipped"].includes(mission.status) ? mission : null;
export const getMissionSourceLabel = (mission: JourneyMission) =>
  mission.sourceType === "task"
    ? "Tarefa"
    : mission.sourceType === "study_session"
      ? "Estudo"
      : mission.sourceType === "project"
        ? "Projeto"
        : "Ação da Jornada";
export const getChallengeProgress = (challenge: WeeklyChallenge) => {
  const target = Math.max(1, challenge.targetValue);
  const progress = Math.min(target, Math.max(0, challenge.progress));
  return {
    progress,
    target,
    percentage: Math.round((progress / target) * 100),
    completed: Boolean(challenge.completedAt) || progress >= target,
  };
};
export const canActivateJourney = (activeCount: number, activeLimit: number | null) =>
  activeLimit === null || activeCount < activeLimit;
export const sourceHref = (mission: JourneyMission) =>
  mission.sourceType === "task"
    ? `/tasks/${mission.sourceId}`
    : mission.sourceType === "study_session"
      ? `/studies/${mission.sourceId}`
      : mission.sourceType === "project"
        ? `/projects/${mission.sourceId}`
        : `/journeys/${mission.journeyId ?? ""}`;
export function getMissionExecutionTarget(mission: JourneyMission): MissionExecutionTarget | null {
  if (!mission.sourceId || (mission.sourceType === "journey_action" && !mission.journeyId))
    return null;
  return {
    href: sourceHref(mission) as MissionExecutionTarget["href"],
    label:
      mission.status === "completed"
        ? "Concluída"
        : mission.status === "active"
          ? "Continuar"
          : mission.sourceType === "journey_action"
            ? "Ver ação"
            : "Começar",
    canCompleteDirectly: mission.sourceType === "journey_action",
  };
}
export const missionReason = (mission: JourneyMission) =>
  mission.sourceType === "task"
    ? "Baseado na sua tarefa prioritária"
    : mission.sourceType === "study_session"
      ? "Baseado na próxima ação dos seus estudos"
      : mission.sourceType === "project"
        ? "Avança um projeto ativo"
        : "Avança sua Jornada";
