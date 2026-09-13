import {
  type ArenaChallenge,
  type ChallengeRanking,
  type ChallengeRankingEntry,
  type ChallengeSuggestion,
  type CreatePersonalChallengeInput,
  type PersonalChallenge,
  type ChallengePeriod,
} from "@/lib/arena";
import { workspaceMutationError } from "@/lib/mutation-errors";
import { supabase } from "@/lib/supabase";

const requireUser = (id: string) => {
  if (!id.trim()) throw new Error("Authenticated user required.");
};

export const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export const deviceLocalDate = () => {
  const tz = deviceTimezone();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

const fromRow = (row: Record<string, unknown>): ArenaChallenge => ({
  id: String(row.id),
  slug: String(row.slug),
  title: String(row.title),
  description: typeof row.description === "string" ? row.description : null,
  type: String(row.type),
  targetValue: Number(row.target_value),
  rewardPoints: Number(row.reward_points),
  startsAt: String(row.starts_at),
  endsAt: String(row.ends_at),
  active: Boolean(row.active),
  progress: Number(row.progress ?? 0),
  joinedAt: typeof row.joined_at === "string" ? row.joined_at : null,
  completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
});

const fromPersonalRow = (row: Record<string, unknown>): PersonalChallenge => ({
  id: String(row.id),
  title: String(row.title),
  description: typeof row.description === "string" ? row.description : null,
  category: String(row.category) as PersonalChallenge["category"],
  period: String(row.period) as PersonalChallenge["period"],
  metric: String(row.metric) as PersonalChallenge["metric"],
  evidenceMode: String(row.evidence_mode) as PersonalChallenge["evidenceMode"],
  targetValue: Number(row.target_value),
  progress: Number(row.progress ?? 0),
  rewardPoints: Number(row.reward_points),
  source: String(row.source) as PersonalChallenge["source"],
  status: String(row.status) as PersonalChallenge["status"],
  startsAt: String(row.starts_at),
  endsAt: String(row.ends_at),
  completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
  createdAt: String(row.created_at),
});

const fromSuggestion = (row: Record<string, unknown>): ChallengeSuggestion => ({
  key: String(row.key),
  title: String(row.title),
  description: String(row.description ?? ""),
  category: String(row.category) as ChallengeSuggestion["category"],
  period: String(row.period) as ChallengeSuggestion["period"],
  metric: String(row.metric) as ChallengeSuggestion["metric"],
  evidenceMode: String(row.evidence_mode) as ChallengeSuggestion["evidenceMode"],
  targetValue: Number(row.target_value),
  rewardPoints: Number(row.reward_points),
});

const fromRankingEntry = (row: Record<string, unknown>): ChallengeRankingEntry => ({
  rank: Number(row.rank),
  memberId: String(row.member_id),
  displayName: String(row.display_name ?? "Membro KIVRYN"),
  username: typeof row.username === "string" ? row.username : null,
  avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
  score: Number(row.score ?? 0),
  isSelf: Boolean(row.is_self),
});

export async function listArenaChallenges(userId: string) {
  requireUser(userId);
  const { data, error } = await supabase.rpc("get_arena_challenges");
  if (error) throw workspaceMutationError(error);
  return ((data ?? []) as Record<string, unknown>[]).map(fromRow);
}

export async function joinArenaChallenge(userId: string, challengeId: string) {
  requireUser(userId);
  if (!challengeId.trim()) throw new Error("Challenge required.");
  const { error } = await supabase.rpc("join_arena_challenge", { p_challenge: challengeId.trim() });
  if (error) throw workspaceMutationError(error);
}

export async function listPersonalChallenges(userId: string) {
  requireUser(userId);
  const { data, error } = await supabase.rpc("get_personal_challenges");
  if (error) throw workspaceMutationError(error);
  return ((data ?? []) as Record<string, unknown>[]).map(fromPersonalRow);
}

export async function listChallengeSuggestions(userId: string) {
  requireUser(userId);
  const { data, error } = await supabase.rpc("get_personal_challenge_suggestions", {
    p_local_date: deviceLocalDate(),
  } as never);
  if (error) throw workspaceMutationError(error);
  return (Array.isArray(data) ? data : []).map((row) => fromSuggestion(row as Record<string, unknown>));
}

export async function createPersonalChallenge(userId: string, input: CreatePersonalChallengeInput) {
  requireUser(userId);
  const { data, error } = await supabase.rpc("create_personal_challenge", {
    p_title: input.title.trim(),
    p_description: input.description?.trim() || null,
    p_category: input.category,
    p_period: input.period,
    p_metric: input.metric,
    p_target_value: input.targetValue,
    p_timezone: deviceTimezone(),
    p_source: input.source ?? "manual",
  } as never);
  if (error) throw workspaceMutationError(error);
  return fromPersonalRow(data as unknown as Record<string, unknown>);
}

export async function checkInPersonalChallenge(userId: string, challengeId: string) {
  requireUser(userId);
  const { data, error } = await supabase.rpc("check_in_personal_challenge", {
    p_challenge: challengeId,
    p_local_date: deviceLocalDate(),
  } as never);
  if (error) throw workspaceMutationError(error);
  return fromPersonalRow(data as unknown as Record<string, unknown>);
}

export async function abandonPersonalChallenge(userId: string, challengeId: string) {
  requireUser(userId);
  const { data, error } = await supabase.rpc("abandon_personal_challenge", {
    p_challenge: challengeId,
  } as never);
  if (error) throw workspaceMutationError(error);
  return fromPersonalRow(data as unknown as Record<string, unknown>);
}

export async function getChallengeRanking(userId: string, period: ChallengePeriod): Promise<ChallengeRanking> {
  requireUser(userId);
  const { data, error } = await supabase.rpc("get_challenge_ranking", {
    p_period: period,
    p_timezone: deviceTimezone(),
    p_limit: 25,
  } as never);
  if (error) throw workspaceMutationError(error);
  const value = (data ?? {}) as Record<string, unknown>;
  const entries = Array.isArray(value.entries) ? value.entries : [];
  return {
    period: String(value.period ?? period) as ChallengePeriod,
    startsAt: String(value.starts_at ?? ""),
    endsAt: String(value.ends_at ?? ""),
    optedIn: Boolean(value.opted_in),
    myRank: value.my_rank == null ? null : Number(value.my_rank),
    myScore: Number(value.my_score ?? 0),
    entries: entries.map((row) => fromRankingEntry(row as Record<string, unknown>)),
  };
}

export async function setChallengeRankingOptIn(userId: string, enabled: boolean) {
  requireUser(userId);
  const { data, error } = await supabase.rpc("set_challenge_ranking_opt_in", {
    p_enabled: enabled,
  } as never);
  if (error) throw workspaceMutationError(error);
  return Boolean(data);
}
