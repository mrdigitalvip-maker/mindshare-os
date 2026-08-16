export type NexoraTier = "NEXORA BASIC" | "NEXORA ADVANCED";
export function resolveCapabilityTier(plan: unknown, status: unknown): NexoraTier {
  const normalizedStatus = typeof status === "string" ? status.toLowerCase() : "";
  const normalizedPlan = typeof plan === "string" ? plan.toLowerCase() : "";
  return ["active", "trialing"].includes(normalizedStatus) &&
    Boolean(normalizedPlan) &&
    normalizedPlan !== "free"
    ? "NEXORA ADVANCED"
    : "NEXORA BASIC";
}
