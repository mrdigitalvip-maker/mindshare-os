import type { KivrynActionDomain } from "./kivryn-action-registry.ts";

const CAPABILITY_DOMAINS: Record<string, readonly KivrynActionDomain[]> = {
  productivity: ["tasks", "projects"],
  planning: ["tasks", "projects"],
  study: ["studies"],
};

/** Existing Agent capability labels are converted into explicit workspace authority. */
export function resolveAgentActionDomains(capabilities: unknown): KivrynActionDomain[] {
  if (!Array.isArray(capabilities)) return [];
  const domains = new Set<KivrynActionDomain>();
  for (const capability of capabilities) {
    if (typeof capability !== "string") continue;
    for (const domain of CAPABILITY_DOMAINS[capability] ?? []) domains.add(domain);
  }
  return [...domains];
}
