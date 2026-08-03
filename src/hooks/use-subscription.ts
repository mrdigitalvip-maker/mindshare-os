import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { withDemoFallback } from "@/lib/demo/fallback";

export type SubscriptionStatus = {
  isPremium: boolean;
  /** "active" | "trialing" | "past_due" | "canceled" | "free" | null */
  status: string | null;
  plan: "free" | "pro";
  currentPeriodEnd: string | null;
  source: "subscriptions" | "profile" | "demo";
};

const FREE: SubscriptionStatus = {
  isPremium: false,
  status: "free",
  plan: "free",
  currentPeriodEnd: null,
  source: "demo",
};

const PREMIUM_STATUSES = new Set(["active", "trialing"]);

/**
 * Single source of truth for premium access.
 *
 * The Stripe webhook writes into `public.subscriptions`, while `profiles.plan`
 * is the denormalized mirror used by other screens. This hook reads
 * `subscriptions` first (authoritative, written by the webhook) and falls back
 * to `profiles.plan` when there is no subscription row yet.
 */
export function useSubscription() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["subscription", user?.id],
    enabled: isAuthenticated && !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<SubscriptionStatus> =>
      withDemoFallback(
        async () => {
          if (!user) return FREE;

          const { data: subscription, error: subscriptionError } = await supabase
            .from("subscriptions")
            .select("status, plan, current_period_end, updated_at")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (subscriptionError) throw subscriptionError;

          if (subscription?.status) {
            const status = String(subscription.status);
            const isPremium = PREMIUM_STATUSES.has(status);
            return {
              isPremium,
              status,
              plan: isPremium ? "pro" : "free",
              currentPeriodEnd:
                (subscription.current_period_end as string | null | undefined) ?? null,
              source: "subscriptions",
            };
          }

          // No subscription row yet — fall back to the profile mirror.
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("plan")
            .eq("id", user.id)
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
        FREE,
        "subscription status",
      ),
  });
}
