import { normalizeEntitlement, type Entitlement } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";
export type SubscriptionSummary = {
  entitlement: Entitlement;
  plan: string | null;
  status: string | null;
  provider: "stripe" | "google_play" | "manual" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};
export async function getSubscription(userId: string): Promise<SubscriptionSummary> {
  const id = userId.trim();
  if (!id) throw new Error("Authenticated user ID is required.");
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status, provider, entitlement, current_period_end, cancel_at_period_end")
    .eq("user_id", id)
    .maybeSingle();
  if (error) throw error;
  return {
    entitlement: data?.entitlement === "premium" ? normalizeEntitlement(data?.status === "canceled" ? "active" : data?.status) : "free",
    plan: data?.plan ?? null,
    status: data?.status ?? null,
    provider: (data?.provider as SubscriptionSummary["provider"]) ?? null,
    currentPeriodEnd: data?.current_period_end ?? null,
    cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
  };
}
