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
export type MomentumSummary = { weekPoints: number; completedMissions: number; streak: number };
export type WeeklyChallenge = {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  rewardPoints: number;
  progress: number;
  completedAt: string | null;
  endsAt: string;
};
export type MissionCandidate = {
  sourceType: MissionSourceType;
  sourceId: string;
  title: string;
  description: string | null;
  rank: number;
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
      const rank =
        due && due < today ? 0 : due === today ? 10 : task.nextAction ? 20 : due ? 40 : 60;
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
        rank: 30,
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
