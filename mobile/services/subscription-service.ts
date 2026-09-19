import { normalizeEntitlement, type Entitlement } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";

export type ActivityRewardStatus = {
  rewardKey: string;
  daysRequired: number;
  currentStreak: number;
  longestStreak: number;
  daysRemaining: number;
  lastActiveDate: string | null;
  qualificationDate: string | null;
  eligible: boolean;
  canClaim: boolean;
  claimed: boolean;
  active: boolean;
  claimedAt: string | null;
  redeemedAt: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  source: string;
  autoRenews: false;
};

export type SubscriptionSummary = {
  entitlement: Entitlement;
  plan: string | null;
  status: string | null;
  provider: "stripe" | "google_play" | "manual" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  source: "subscriptions" | "activity_reward" | "internal_override";
  activityReward: ActivityRewardStatus;
};

const rewardFrom = (value: unknown): ActivityRewardStatus => {
  const reward =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    rewardKey: String(reward.rewardKey ?? "activity_90_day_v1"),
    daysRequired: Number(reward.daysRequired ?? 90),
    currentStreak: Number(reward.currentStreak ?? 0),
    longestStreak: Number(reward.longestStreak ?? 0),
    daysRemaining: Number(reward.daysRemaining ?? 90),
    lastActiveDate: typeof reward.lastActiveDate === "string" ? reward.lastActiveDate : null,
    qualificationDate:
      typeof reward.qualificationDate === "string" ? reward.qualificationDate : null,
    eligible: reward.eligible === true,
    canClaim: reward.canClaim === true,
    claimed: reward.claimed === true,
    active: reward.active === true,
    claimedAt: typeof reward.claimedAt === "string" ? reward.claimedAt : null,
    redeemedAt: typeof reward.redeemedAt === "string" ? reward.redeemedAt : null,
    startsAt: typeof reward.startsAt === "string" ? reward.startsAt : null,
    expiresAt: typeof reward.expiresAt === "string" ? reward.expiresAt : null,
    source: String(reward.source ?? "kivryn_90_day_activity"),
    autoRenews: false,
  };
};

export async function getSubscription(userId: string): Promise<SubscriptionSummary> {
  const id = userId.trim();
  if (!id) throw new Error("Authenticated user ID is required.");

  const { data, error } = await supabase.rpc("get_subscription_runtime" as never);
  if (error) throw error;
  const runtime = (data ?? {}) as Record<string, unknown>;
  const status = typeof runtime.status === "string" ? runtime.status : null;
  const premium = runtime.is_premium === true;
  const entitlement: Entitlement = premium
    ? status === "trialing"
      ? "trialing"
      : "active"
    : normalizeEntitlement(status);

  const provider = runtime.provider;
  const runtimeSource = String(runtime.source ?? "subscriptions");
  return {
    entitlement,
    plan: typeof runtime.plan === "string" ? runtime.plan : premium ? "pro" : "free",
    status,
    provider: ["stripe", "google_play", "manual"].includes(String(provider))
      ? (provider as SubscriptionSummary["provider"])
      : null,
    currentPeriodEnd:
      typeof runtime.current_period_end === "string" ? runtime.current_period_end : null,
    cancelAtPeriodEnd:
      typeof runtime.cancel_at_period_end === "boolean"
        ? runtime.cancel_at_period_end
        : null,
    source: ["subscriptions", "activity_reward", "internal_override"].includes(runtimeSource)
      ? (runtimeSource as SubscriptionSummary["source"])
      : "subscriptions",
    activityReward: rewardFrom(runtime.activity_reward),
  };
}

export async function claimPremiumActivityReward(): Promise<ActivityRewardStatus> {
  const { data, error } = await supabase.rpc("claim_premium_activity_reward" as never);
  if (error) throw error;
  return rewardFrom(data);
}
