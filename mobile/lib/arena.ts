export type ArenaChallenge = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  targetValue: number;
  rewardPoints: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  progress: number;
  joinedAt: string | null;
  completedAt: string | null;
};

export type ArenaChallengeState = "upcoming" | "joinable" | "joined" | "completed" | "ended";

export type ChallengePeriod = "daily" | "weekly" | "monthly";
export type ChallengeCategory = "execution" | "study" | "fitness" | "wellbeing" | "journey" | "custom";
export type ChallengeMetric = "task_completions" | "study_minutes" | "journey_missions" | "self_checkins";
export type ChallengeEvidence = "verified" | "self_reported";
export type PersonalChallengeStatus = "active" | "completed" | "abandoned";

export type PersonalChallenge = {
  id: string;
  title: string;
  description: string | null;
  category: ChallengeCategory;
  period: ChallengePeriod;
  metric: ChallengeMetric;
  evidenceMode: ChallengeEvidence;
  targetValue: number;
  progress: number;
  rewardPoints: number;
  source: "manual" | "suggestion" | "assistant";
  status: PersonalChallengeStatus;
  startsAt: string;
  endsAt: string;
  completedAt: string | null;
  createdAt: string;
};

export type ChallengeSuggestion = {
  key: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  period: ChallengePeriod;
  metric: ChallengeMetric;
  evidenceMode: ChallengeEvidence;
  targetValue: number;
  rewardPoints: number;
};

export type ChallengeRankingEntry = {
  rank: number;
  memberId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  score: number;
  isSelf: boolean;
};

export type ChallengeRanking = {
  period: ChallengePeriod;
  startsAt: string;
  endsAt: string;
  optedIn: boolean;
  myRank: number | null;
  myScore: number;
  entries: ChallengeRankingEntry[];
};

export type CreatePersonalChallengeInput = {
  title: string;
  description?: string | null;
  category: ChallengeCategory;
  period: ChallengePeriod;
  metric: ChallengeMetric;
  targetValue: number;
  source?: "manual" | "suggestion" | "assistant";
};

export function resolveArenaChallenge(challenge: ArenaChallenge, now = new Date()) {
  const target = Math.max(1, challenge.targetValue);
  const progress = Math.min(target, Math.max(0, challenge.progress));
  const starts = new Date(challenge.startsAt).getTime();
  const ends = new Date(challenge.endsAt).getTime();
  const timestamp = now.getTime();
  let state: ArenaChallengeState;
  if (challenge.completedAt || progress >= target) state = "completed";
  else if (!challenge.active || timestamp >= ends) state = "ended";
  else if (timestamp < starts) state = "upcoming";
  else if (challenge.joinedAt) state = "joined";
  else state = "joinable";
  return { state, progress, target, ratio: progress / target };
}

export const isCurrentArenaChallenge = (challenge: ArenaChallenge, now = new Date()) => {
  const state = resolveArenaChallenge(challenge, now).state;
  return state === "upcoming" || state === "joinable" || state === "joined";
};

export const arenaProgressLabel = (challenge: ArenaChallenge) => {
  const { progress, target } = resolveArenaChallenge(challenge);
  if (challenge.type === "mission_completions")
    return `${progress} de ${target} missões verificadas`;
  if (challenge.type === "momentum") return `${progress} de ${target} Momentum verificado`;
  return `${progress} de ${target} eventos verificados`;
};

export function resolvePersonalChallenge(challenge: PersonalChallenge) {
  const target = Math.max(1, challenge.targetValue);
  const progress = Math.min(target, Math.max(0, challenge.progress));
  return { progress, target, ratio: progress / target, remaining: Math.max(0, target - progress) };
}

export function challengeMetricLabel(metric: ChallengeMetric, amount: number) {
  if (metric === "study_minutes") return `${amount} min`;
  if (metric === "task_completions") return `${amount} tarefa${amount === 1 ? "" : "s"}`;
  if (metric === "journey_missions") return `${amount} miss${amount === 1 ? "ão" : "ões"}`;
  return `${amount} check-in${amount === 1 ? "" : "s"}`;
}

export const challengeLevel = (momentum: number) =>
  Math.max(1, Math.floor(Math.sqrt(Math.max(0, momentum) / 250)) + 1);
