export type Entitlement = "free" | "trialing" | "active" | "expired";
export function normalizeEntitlement(status: unknown): Entitlement {
  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "canceled" || status === "expired" || status === "past_due") return "expired";
  return "free";
}
export const isPremiumEntitlement = (entitlement: Entitlement) =>
  entitlement === "active" || entitlement === "trialing";
