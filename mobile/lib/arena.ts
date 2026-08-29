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
