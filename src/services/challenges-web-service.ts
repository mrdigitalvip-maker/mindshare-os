import { supabase } from "@/lib/supabase";

export type WebChallengePeriod = "daily" | "weekly" | "monthly";
export type WebChallengeCategory = "execution" | "study" | "fitness" | "wellbeing" | "journey" | "custom";
export type WebChallengeMetric = "task_completions" | "study_minutes" | "journey_missions" | "self_checkins";

export type WebPersonalChallenge = {
  id: string;
  title: string;
  description: string | null;
  category: WebChallengeCategory;
  period: WebChallengePeriod;
  metric: WebChallengeMetric;
  evidenceMode: "verified" | "self_reported";
  targetValue: number;
  progress: number;
  rewardPoints: number;
  status: "active" | "completed" | "abandoned" | "expired";
  startsAt: string;
  endsAt: string;
};

export type WebChallengeSuggestion = {
  key: string;
  title: string;
  description: string;
  category: WebChallengeCategory;
  period: WebChallengePeriod;
  metric: WebChallengeMetric;
  evidenceMode: "verified" | "self_reported";
  targetValue: number;
  rewardPoints: number;
};

export type WebChallengeRankingEntry = {
  rank: number;
  memberId: string;
  displayName: string;
  username: string | null;
  score: number;
  isSelf: boolean;
};

export type WebChallengeRanking = {
  period: WebChallengePeriod;
  optedIn: boolean;
  myRank: number | null;
  myScore: number;
  entries: WebChallengeRankingEntry[];
};

const requireUser = (value: string) => {
  const id = value.trim();
  if (!id) throw new Error("Authenticated user required.");
  return id;
};

const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const localDate = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const challengeFrom = (value: unknown): WebPersonalChallenge => {
  const row = record(value);
  return {
    id: String(row.id),
    title: String(row.title),
    description: typeof row.description === "string" ? row.description : null,
    category: String(row.category) as WebChallengeCategory,
    period: String(row.period) as WebChallengePeriod,
    metric: String(row.metric) as WebChallengeMetric,
    evidenceMode: String(row.evidence_mode) as WebPersonalChallenge["evidenceMode"],
    targetValue: Number(row.target_value ?? 0),
    progress: Number(row.progress ?? 0),
    rewardPoints: Number(row.reward_points ?? 0),
    status: String(row.status) as WebPersonalChallenge["status"],
    startsAt: String(row.starts_at ?? ""),
    endsAt: String(row.ends_at ?? ""),
  };
};

export async function listWebPersonalChallenges(userId: string) {
  requireUser(userId);
  const { data, error } = await supabase.rpc("get_personal_challenges" as never);
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(challengeFrom);
}

export async function listWebChallengeSuggestions(userId: string): Promise<WebChallengeSuggestion[]> {
  requireUser(userId);
  const { data, error } = await supabase.rpc("get_personal_challenge_suggestions" as never, {
    p_local_date: localDate(),
  } as never);
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map((value) => {
    const row = record(value);
    return {
      key: String(row.key),
      title: String(row.title),
      description: String(row.description ?? ""),
      category: String(row.category) as WebChallengeCategory,
      period: String(row.period) as WebChallengePeriod,
      metric: String(row.metric) as WebChallengeMetric,
      evidenceMode: String(row.evidence_mode) as WebChallengeSuggestion["evidenceMode"],
      targetValue: Number(row.target_value ?? 0),
      rewardPoints: Number(row.reward_points ?? 0),
    };
  });
}

export async function createWebPersonalChallenge(
  userId: string,
  input: {
    title: string;
    description?: string | null;
    category: WebChallengeCategory;
    period: WebChallengePeriod;
    metric: WebChallengeMetric;
    targetValue: number;
    source?: "manual" | "suggestion" | "ai";
  },
) {
  requireUser(userId);
  const { data, error } = await supabase.rpc("create_personal_challenge" as never, {
    p_title: input.title.trim(),
    p_description: input.description?.trim() || null,
    p_category: input.category,
    p_period: input.period,
    p_metric: input.metric,
    p_target_value: input.targetValue,
    p_timezone: timezone(),
    p_source: input.source ?? "manual",
  } as never);
  if (error) throw error;
  return challengeFrom(data);
}

export async function checkInWebPersonalChallenge(userId: string, challengeId: string) {
  requireUser(userId);
  const { data, error } = await supabase.rpc("check_in_personal_challenge" as never, {
    p_challenge: challengeId,
    p_local_date: localDate(),
  } as never);
  if (error) throw error;
  return challengeFrom(data);
}

export async function abandonWebPersonalChallenge(userId: string, challengeId: string) {
  requireUser(userId);
  const { data, error } = await supabase.rpc("abandon_personal_challenge" as never, {
    p_challenge: challengeId,
  } as never);
  if (error) throw error;
  return challengeFrom(data);
}

export async function getWebChallengeRanking(
  userId: string,
  period: WebChallengePeriod,
): Promise<WebChallengeRanking> {
  requireUser(userId);
  const { data, error } = await supabase.rpc("get_challenge_ranking" as never, {
    p_period: period,
    p_timezone: timezone(),
    p_limit: 25,
  } as never);
  if (error) throw error;
  const value = record(data);
  const entries = Array.isArray(value.entries) ? value.entries : [];
  return {
    period: String(value.period ?? period) as WebChallengePeriod,
    optedIn: Boolean(value.opted_in),
    myRank: value.my_rank == null ? null : Number(value.my_rank),
    myScore: Number(value.my_score ?? 0),
    entries: entries.map((entry) => {
      const row = record(entry);
      return {
        rank: Number(row.rank),
        memberId: String(row.member_id),
        displayName: String(row.display_name ?? "KIVRYN member"),
        username: typeof row.username === "string" ? row.username : null,
        score: Number(row.score ?? 0),
        isSelf: Boolean(row.is_self),
      };
    }),
  };
}

export async function setWebChallengeRankingOptIn(userId: string, enabled: boolean) {
  requireUser(userId);
  const { data, error } = await supabase.rpc("set_challenge_ranking_opt_in" as never, {
    p_enabled: enabled,
  } as never);
  if (error) throw error;
  return Boolean(data);
}
