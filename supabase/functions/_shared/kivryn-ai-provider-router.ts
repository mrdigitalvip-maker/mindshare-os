import {
  KIVRYN_AI_PROVIDER_REGISTRY,
  providerConfigured,
  type KivrynAiCapability,
  type KivrynAiProviderId,
} from "./kivryn-ai-provider-registry.ts";

export class KivrynAiProviderRouteError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "KivrynAiProviderRouteError";
  }
}

const PRIMARY_PROVIDER: Record<KivrynAiCapability, KivrynAiProviderId> = {
  text: "openai",
  reasoning: "openai",
  vision: "openai",
  audio_input: "gemini",
  audio_output: "gemini",
  live_voice: "gemini",
  video_understanding: "gemini",
  embeddings: "openai",
  tool_calling: "openai",
};

function enabled(provider: KivrynAiProviderId, capability: KivrynAiCapability) {
  return KIVRYN_AI_PROVIDER_REGISTRY[provider].enabledCapabilities.includes(capability);
}

export function routeKivrynAiProvider(input: {
  capability: KivrynAiCapability;
  preferredProvider?: KivrynAiProviderId;
  allowFallback?: boolean;
}) {
  const primary = input.preferredProvider ?? PRIMARY_PROVIDER[input.capability];
  if (enabled(primary, input.capability) && providerConfigured(primary)) {
    return { provider: primary, fallback: false };
  }

  // OpenAI remains primary for text/reasoning. Gemini text fallback is opt-in
  // server policy only; a client cannot enable it.
  if (
    input.allowFallback &&
    input.capability !== "live_voice" &&
    input.capability !== "audio_input" &&
    input.capability !== "audio_output" &&
    Deno.env.get("KIVRYN_GEMINI_TEXT_FALLBACK") === "true" &&
    enabled("gemini", input.capability) &&
    providerConfigured("gemini")
  ) {
    return { provider: "gemini" as const, fallback: true };
  }

  throw new KivrynAiProviderRouteError(
    enabled(primary, input.capability) ? "provider_not_configured" : "capability_not_enabled",
  );
}

export function normalizeAiProviderHttpError(status: number) {
  if (status === 429) return "provider_quota_limited";
  if (status === 401 || status === 403) return "provider_auth_failed";
  if (status >= 500) return "provider_unavailable";
  return "provider_error";
}
