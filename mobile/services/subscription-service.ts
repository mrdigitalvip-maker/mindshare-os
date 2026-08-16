import { normalizeEntitlement, type Entitlement } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";
export type SubscriptionSummary = {
  entitlement: Entitlement;
  plan: string | null;
  status: string | null;
};
export async function getSubscription(userId: string): Promise<SubscriptionSummary> {
  const id = userId.trim();
  if (!id) throw new Error("Authenticated user ID is required.");
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", id)
    .maybeSingle();
  if (error) throw error;
  return {
    entitlement: normalizeEntitlement(data?.status),
    plan: data?.plan ?? null,
    status: data?.status ?? null,
  };
}
