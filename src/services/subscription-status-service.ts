import { withDemoFallback } from "@/lib/demo/fallback";
import { supabase } from "@/lib/supabase";
import { getRequiredUserId } from "./supabase-service";

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

export type SubscriptionStatus = {
  isPremium: boolean;
  status: string | null;
  plan: "free" | "pro";
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  source: "subscriptions" | "activity_reward" | "internal_override" | "demo";
  provider: "stripe" | "google_play" | "manual" | null;
  activityReward: ActivityRewardStatus;
};
export const FREE_SUBSCRIPTION: SubscriptionStatus = {
  isPremium: false,
  status: "free",
  plan: "free",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  source: "demo",
  provider: null,
  activityReward: {
    rewardKey: "activity_90_day_v1",
    daysRequired: 90,
    currentStreak: 0,
    longestStreak: 0,
    daysRemaining: 90,
    lastActiveDate: null,
    qualificationDate: null,
    eligible: false,
    canClaim: false,
    claimed: false,
    active: false,
    claimedAt: null,
    redeemedAt: null,
    startsAt: null,
    expiresAt: null,
    source: "kivryn_90_day_activity",
    autoRenews: false,
  },
};
export const SubscriptionStatusService = {
  async get(userId?: string): Promise<SubscriptionStatus> {
    return withDemoFallback<SubscriptionStatus>(
      async () => {
        const authenticatedUserId = await getRequiredUserId();
        if (userId && userId !== authenticatedUserId) {
          throw new Error("Subscriptions can only be read for the authenticated user.");
        }
        const { data, error } = await supabase.rpc("get_subscription_runtime" as never);
        if (error) throw error;
        const runtime = (data ?? {}) as Record<string, unknown>;
        const provider = runtime.provider;
        const reward =
          runtime.activity_reward && typeof runtime.activity_reward === "object"
            ? (runtime.activity_reward as Record<string, unknown>)
            : {};
        const runtimeSource = String(runtime.source ?? "subscriptions");
        return {
          isPremium: runtime.is_premium === true,
          status: typeof runtime.status === "string" ? runtime.status : null,
          plan: runtime.is_premium === true ? "pro" : "free",
          currentPeriodEnd:
            typeof runtime.current_period_end === "string" ? runtime.current_period_end : null,
          cancelAtPeriodEnd: runtime.cancel_at_period_end === true,
          source: ["subscriptions", "activity_reward", "internal_override"].includes(runtimeSource)
            ? (runtimeSource as SubscriptionStatus["source"])
            : "subscriptions",
          provider: ["stripe", "google_play", "manual"].includes(String(provider))
            ? (provider as SubscriptionStatus["provider"])
            : null,
          activityReward: {
            rewardKey: String(reward.rewardKey ?? "activity_90_day_v1"),
            daysRequired: Number(reward.daysRequired ?? 90),
            currentStreak: Number(reward.currentStreak ?? 0),
            longestStreak: Number(reward.longestStreak ?? 0),
            daysRemaining: Number(reward.daysRemaining ?? 90),
            lastActiveDate:
              typeof reward.lastActiveDate === "string" ? reward.lastActiveDate : null,
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
          },
        };
      },
      FREE_SUBSCRIPTION,
      "subscription status",
    );
  },

  async claimActivityReward(): Promise<ActivityRewardStatus> {
    const { data, error } = await supabase.rpc("claim_premium_activity_reward" as never);
    if (error) throw error;
    const reward = (data ?? {}) as Record<string, unknown>;
    return {
      rewardKey: String(reward.rewardKey ?? "activity_90_day_v1"),
      daysRequired: Number(reward.daysRequired ?? 90),
      currentStreak: Number(reward.currentStreak ?? 0),
      longestStreak: Number(reward.longestStreak ?? 0),
      daysRemaining: Number(reward.daysRemaining ?? 0),
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
  },
};
