import { withDemoFallback } from "@/lib/demo/fallback";
import { supabase } from "@/lib/supabase";
import { getRequiredUserId } from "./supabase-service";

export type SubscriptionStatus = {
  isPremium: boolean;
  status: string | null;
  plan: "free" | "pro";
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  source: "subscriptions" | "demo";
  provider: "stripe" | "google_play" | "manual" | null;
};
export const FREE_SUBSCRIPTION: SubscriptionStatus = {
  isPremium: false,
  status: "free",
  plan: "free",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  source: "demo",
  provider: null,
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
        return {
          isPremium: runtime.is_premium === true,
          status: typeof runtime.status === "string" ? runtime.status : null,
          plan: runtime.is_premium === true ? "pro" : "free",
          currentPeriodEnd:
            typeof runtime.current_period_end === "string" ? runtime.current_period_end : null,
          cancelAtPeriodEnd: runtime.cancel_at_period_end === true,
          source: "subscriptions",
          provider: ["stripe", "google_play", "manual"].includes(String(provider))
            ? (provider as SubscriptionStatus["provider"])
            : null,
        };
      },
      FREE_SUBSCRIPTION,
      "subscription status",
    );
  },
};
