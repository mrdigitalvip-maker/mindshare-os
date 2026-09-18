import { normalizeEntitlement, type Entitlement } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";

export type SubscriptionSummary = {
  entitlement: Entitlement;
  plan: string | null;
  status: string | null;
  provider: "stripe" | "google_play" | "manual" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
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
  };
}
