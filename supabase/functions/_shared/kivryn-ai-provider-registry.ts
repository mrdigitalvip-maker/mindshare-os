export type KivrynAiProviderId = "openai" | "gemini";
export type KivrynAiBillingMode = "free" | "paid";
export type KivrynAiCapability =
  | "text"
  | "reasoning"
  | "vision"
  | "audio_input"
  | "audio_output"
  | "live_voice"
  | "video_understanding"
  | "embeddings"
  | "tool_calling";

export type KivrynAiProviderDefinition = {
  id: KivrynAiProviderId;
  label: string;
  capabilities: readonly KivrynAiCapability[];
  enabledCapabilities: readonly KivrynAiCapability[];
  authority: "none";
  credentialBoundary: "server_only";
};

const ALL_GEMINI_CAPABILITIES: readonly KivrynAiCapability[] = [
  "text",
  "reasoning",
  "vision",
  "audio_input",
  "audio_output",
  "live_voice",
  "video_understanding",
  "embeddings",
  "tool_calling",
];

export const KIVRYN_AI_PROVIDER_REGISTRY: Record<
  KivrynAiProviderId,
  KivrynAiProviderDefinition
> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    capabilities: ["text", "reasoning", "vision", "embeddings", "tool_calling"],
    enabledCapabilities: ["text", "reasoning", "vision", "tool_calling"],
    authority: "none",
    credentialBoundary: "server_only",
  },
  gemini: {
    id: "gemini",
    label: "Gemini",
    capabilities: ALL_GEMINI_CAPABILITIES,
    // E68 enables only bounded non-Live base capabilities.
    // Live/audio/video routing remains disabled until dedicated Editions.
    enabledCapabilities: ["text", "reasoning"],
    authority: "none",
    credentialBoundary: "server_only",
  },
};

export function geminiBillingMode(): KivrynAiBillingMode {
  const requested = Deno.env.get("GEMINI_MODE")?.trim().toLowerCase();
  const paidAuthorized = Deno.env.get("GEMINI_PAID_AUTHORIZED") === "true";
  return requested === "paid" && paidAuthorized ? "paid" : "free";
}

export function providerConfigured(provider: KivrynAiProviderId) {
  if (provider === "openai") {
    return Boolean(Deno.env.get("OPENAI_API_KEY"));
  }
  const credential = Deno.env.get("GEMINI_AUTH_KEY") ?? Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_TEXT_MODEL");
  return Boolean(credential && model);
}

export function safeProviderSnapshot(provider: KivrynAiProviderId) {
  const definition = KIVRYN_AI_PROVIDER_REGISTRY[provider];
  return {
    id: definition.id,
    label: definition.label,
    capabilities: [...definition.capabilities],
    enabledCapabilities: [...definition.enabledCapabilities],
    configured: providerConfigured(provider),
    credentialBoundary: definition.credentialBoundary,
    authority: definition.authority,
    ...(provider === "gemini" ? { billingMode: geminiBillingMode() } : {}),
  };
}
