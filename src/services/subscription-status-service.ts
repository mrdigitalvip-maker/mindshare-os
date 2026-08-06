import { withDemoFallback } from "@/lib/demo/fallback";
import { supabase } from "@/lib/supabase";
import { getRequiredUserId } from "./supabase-service";

export type SubscriptionStatus = {
  isPremium: boolean;
  status: string | null;
  plan: "free" | "pro";
  currentPeriodEnd: string | null;
  source: "subscriptions" | "demo";
};
export const FREE_SUBSCRIPTION: SubscriptionStatus = {
  isPremium: false,
  status: "free",
  plan: "free",
  currentPeriodEnd: null,
  source: "demo",
};
const PREMIUM_STATUSES = new Set(["active", "trialing"]);

export const SubscriptionStatusService = {
  async get(userId?: string): Promise<SubscriptionStatus> {
    return withDemoFallback(
      async () => {
        const authenticatedUserId = await getRequiredUserId();
        if (userId && userId !== authenticatedUserId) {
          throw new Error("Subscriptions can only be read for the authenticated user.");
        }
        const { data: subscription, error } = await supabase
          .from("subscriptions")
          .select("status, current_period_end, updated_at")
          .eq("user_id", authenticatedUserId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (subscription?.status) {
          const status = String(subscription.status);
          const isPremium = PREMIUM_STATUSES.has(status);
          return {
            isPremium,
            status,
            plan: isPremium ? "pro" : "free",
            currentPeriodEnd: subscription.current_period_end ?? null,
            source: "subscriptions",
          };
        }
        return {
          isPremium: false,
          status: null,
          plan: "free",
          currentPeriodEnd: null,
          source: "subscriptions",
        };
      },
      FREE_SUBSCRIPTION,
      "subscription status",
    );
  },
};
