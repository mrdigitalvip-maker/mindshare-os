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
  sourcePackId: string | null;
  sourcePackVersion: number | null;
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
export type JourneyProgramStepStatus = "completed" | "current" | "upcoming";
export type JourneyProgramStep = {
  id: string;
  sequence: number;
  phase: string;
  title: string;
  description: string;
  required: boolean;
  completedAt: string | null;
  status: JourneyProgramStepStatus;
};
export type JourneyProgramState = {
  journeyId: string;
  totalSteps: number;
  completedSteps: number;
  progressRatio: number;
  currentStep: JourneyProgramStep | null;
  steps: JourneyProgramStep[];
};
export type JourneyProgramStepRecord = Omit<JourneyProgramStep, "status">;

/** Builds persisted program progress. Instance IDs are the identity and timestamps are authoritative. */
export function buildJourneyProgramState(
  journeyId: string,
  records: JourneyProgramStepRecord[],
): JourneyProgramState | null {
  const ordered = [...new Map(records.map((step) => [step.id, step])).values()].sort(
    (a, b) => a.sequence - b.sequence,
  );
  if (!ordered.length) return null;
  const currentId = ordered.find((step) => !step.completedAt)?.id ?? null;
  const steps: JourneyProgramStep[] = ordered.map((step) => ({
    ...step,
    status: step.completedAt ? "completed" : step.id === currentId ? "current" : "upcoming",
  }));
  const completedSteps = steps.filter((step) => step.status === "completed").length;
  return {
    journeyId,
    totalSteps: steps.length,
    completedSteps,
    progressRatio: completedSteps / steps.length,
    currentStep: steps.find((step) => step.status === "current") ?? null,
    steps,
  };
}
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type CreateJourneyInput = {
  title: string;
  objective: string;
  context?: string;
  category: JourneyCategory;
  targetDate?: string | null;
};

/** Builds the exact values accepted by the journeys table, without changing server authority. */
export function journeyCreatePayload(input: CreateJourneyInput, today = new Date()) {
  const title = input.title.trim();
  const objective = input.objective.trim();
  const startDate = localDateKey(today);
  const targetDate = input.targetDate?.trim() || null;
  if (!title || !objective) throw new Error("JOURNEY_REQUIRED_FIELDS");
  if (title.length > 160 || objective.length > 1000) throw new Error("JOURNEY_FIELD_TOO_LONG");
  if (
    targetDate &&
    (!ISO_DATE.test(targetDate) || Number.isNaN(Date.parse(`${targetDate}T12:00:00`)))
  )
    throw new Error("JOURNEY_INVALID_DATE");
  if (targetDate && targetDate < startDate) throw new Error("JOURNEY_INVALID_DATE");
  return {
    title,
    objective,
    context: input.context?.trim() || null,
    category: input.category,
    start_date: startDate,
    target_date: targetDate,
  };
}
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
