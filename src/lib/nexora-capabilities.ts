import type { SubscriptionStatus } from "@/services/subscription-status-service";

export type NexoraCapabilities = {
  tier: "basic" | "advanced";
  label: "NEXORA BASIC" | "NEXORA ADVANCED";
  advancedVoice: boolean;
  proactiveSuggestions: boolean;
};

const BASIC: NexoraCapabilities = {
  tier: "basic",
  label: "NEXORA BASIC",
  advancedVoice: false,
  proactiveSuggestions: false,
};

/** Subscription results are authoritative; missing and failed lookups fail closed to Basic. */
export function resolveNexoraCapabilities(
  subscription?: SubscriptionStatus | null,
): NexoraCapabilities {
  if (!subscription?.isPremium) return BASIC;
  return {
    tier: "advanced",
    label: "NEXORA ADVANCED",
    advancedVoice: true,
    proactiveSuggestions: true,
  };
}
