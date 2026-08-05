import { withDemoFallback } from "@/lib/demo/fallback";
import { supabase } from "@/lib/supabase";

export type SubscriptionStatus = {
  isPremium: boolean;
  status: string | null;
  plan: "free" | "pro";
  currentPeriodEnd: string | null;
  source: "subscriptions" | "profile" | "demo";
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
        if (!userId) return FREE_SUBSCRIPTION;
        const { data: subscription, error } = await supabase
          .from("subscriptions")
          .select("status, current_period_end, updated_at")
          .eq("user_id", userId)
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
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", userId)
          .maybeSingle();
        if (profileError) throw profileError;
        const isPremium = (profile?.plan ?? "free") === "pro";
        return {
          isPremium,
          status: isPremium ? "active" : "free",
          plan: isPremium ? "pro" : "free",
          currentPeriodEnd: null,
          source: "profile",
        };
      },
      FREE_SUBSCRIPTION,
      "subscription status",
    );
  },
};
