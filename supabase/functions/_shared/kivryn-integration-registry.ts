export type KivrynIntegrationProvider =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "gmail"
  | "google_calendar"
  | "google_drive"
  | "slack"
  | "whatsapp";

export type KivrynIntegrationConnectionStatus =
  | "not_connected"
  | "authorizing"
  | "connected"
  | "expired"
  | "revoked"
  | "error";

export type KivrynIntegrationCapability =
  | "profile.read"
  | "media.metadata.read"
  | "media.list"
  | "analytics.read"
  | "source.import"
  | "mail.read"
  | "mail.send"
  | "calendar.read"
  | "calendar.write"
  | "files.read"
  | "files.write"
  | "messages.read"
  | "messages.send";

export type KivrynIntegrationRisk = "read" | "external_mutation";

export const KIVRYN_INTEGRATION_CAPABILITIES: Record<
  KivrynIntegrationCapability,
  { risk: KivrynIntegrationRisk; requiresApproval: boolean }
> = {
  "profile.read": { risk: "read", requiresApproval: false },
  "media.metadata.read": { risk: "read", requiresApproval: false },
  "media.list": { risk: "read", requiresApproval: false },
  "analytics.read": { risk: "read", requiresApproval: false },
  "source.import": { risk: "external_mutation", requiresApproval: true },
  "mail.read": { risk: "read", requiresApproval: false },
  "mail.send": { risk: "external_mutation", requiresApproval: true },
  "calendar.read": { risk: "read", requiresApproval: false },
  "calendar.write": { risk: "external_mutation", requiresApproval: true },
  "files.read": { risk: "read", requiresApproval: false },
  "files.write": { risk: "external_mutation", requiresApproval: true },
  "messages.read": { risk: "read", requiresApproval: false },
  "messages.send": { risk: "external_mutation", requiresApproval: true },
};

export type KivrynProviderReadiness =
  | "configuration_required"
  | "app_review_required"
  | "coming_soon";

export interface KivrynIntegrationProviderDefinition {
  provider: KivrynIntegrationProvider;
  implemented: boolean;
  readiness: KivrynProviderReadiness;
  authMode: "oauth" | "unconfigured";
  credentialBoundary: "server_only";
  capabilities: readonly KivrynIntegrationCapability[];
  capabilityScopes: Partial<Record<KivrynIntegrationCapability, readonly string[]>>;
}

/**
 * Provider-agnostic integration contracts.
 *
 * This registry describes what a provider may expose; it does not make a provider
 * executable. Runtime configuration, a real connected account, explicit scopes,
 * Action Registry membership, approval (for mutations), execution and audit are
 * separate gates. Future providers remain fail-closed until a real adapter exists.
 */
export const KIVRYN_INTEGRATION_PROVIDERS: Record<
  KivrynIntegrationProvider,
  KivrynIntegrationProviderDefinition
> = {
  youtube: {
    provider: "youtube",
    implemented: true,
    readiness: "configuration_required",
    authMode: "oauth",
    credentialBoundary: "server_only",
    capabilities: ["profile.read", "media.metadata.read", "analytics.read"],
    capabilityScopes: {
      "profile.read": ["https://www.googleapis.com/auth/youtube.readonly"],
      "media.metadata.read": ["https://www.googleapis.com/auth/youtube.readonly"],
      "analytics.read": ["https://www.googleapis.com/auth/yt-analytics.readonly"],
    },
  },
  tiktok: {
    provider: "tiktok",
    implemented: true,
    readiness: "app_review_required",
    authMode: "oauth",
    credentialBoundary: "server_only",
    capabilities: ["profile.read", "media.list"],
    capabilityScopes: {
      "profile.read": ["user.info.basic"],
      "media.list": ["video.list"],
    },
  },
  instagram: {
    provider: "instagram",
    implemented: false,
    readiness: "app_review_required",
    authMode: "unconfigured",
    credentialBoundary: "server_only",
    capabilities: [],
    capabilityScopes: {},
  },
  gmail: {
    provider: "gmail",
    implemented: true,
    readiness: "configuration_required",
    authMode: "oauth",
    credentialBoundary: "server_only",
    capabilities: ["mail.read", "mail.send"],
    capabilityScopes: {
      "mail.read": ["https://www.googleapis.com/auth/gmail.readonly"],
      "mail.send": ["https://www.googleapis.com/auth/gmail.send"],
    },
  },
  google_calendar: {
    provider: "google_calendar",
    implemented: true,
    readiness: "configuration_required",
    authMode: "oauth",
    credentialBoundary: "server_only",
    capabilities: ["calendar.read", "calendar.write"],
    capabilityScopes: {
      "calendar.read": ["https://www.googleapis.com/auth/calendar.readonly"],
      "calendar.write": ["https://www.googleapis.com/auth/calendar.events"],
    },
  },
  google_drive: {
    provider: "google_drive",
    implemented: true,
    readiness: "configuration_required",
    authMode: "oauth",
    credentialBoundary: "server_only",
    capabilities: ["files.read", "files.write"],
    capabilityScopes: {
      "files.read": ["https://www.googleapis.com/auth/drive.readonly"],
      "files.write": ["https://www.googleapis.com/auth/drive.file"],
    },
  },
  slack: {
    provider: "slack",
    implemented: false,
    readiness: "coming_soon",
    authMode: "unconfigured",
    credentialBoundary: "server_only",
    capabilities: ["messages.read", "messages.send"],
    capabilityScopes: {},
  },
  whatsapp: {
    provider: "whatsapp",
    implemented: false,
    readiness: "coming_soon",
    authMode: "unconfigured",
    credentialBoundary: "server_only",
    capabilities: ["messages.read", "messages.send"],
    capabilityScopes: {},
  },
};

export type KivrynConnectedAccount = {
  id: string;
  provider: KivrynIntegrationProvider;
  status: KivrynIntegrationConnectionStatus;
  grantedScopes: readonly string[];
  capabilities: readonly KivrynIntegrationCapability[];
};

/**
 * Server-side authorization helper. Absence of any gate is denial.
 * Empty scope declarations intentionally deny capability access.
 */
export function canUseKivrynIntegrationCapability(input: {
  provider: KivrynIntegrationProvider;
  capability: KivrynIntegrationCapability;
  connectionStatus: KivrynIntegrationConnectionStatus;
  grantedScopes: readonly string[];
  runtimeConfigured: boolean;
}) {
  const definition = KIVRYN_INTEGRATION_PROVIDERS[input.provider];
  if (
    !definition.implemented ||
    !input.runtimeConfigured ||
    input.connectionStatus !== "connected" ||
    !definition.capabilities.includes(input.capability)
  ) {
    return false;
  }

  const requiredScopes = definition.capabilityScopes[input.capability] ?? [];
  if (requiredScopes.length === 0) return false;
  const granted = new Set(input.grantedScopes);
  return requiredScopes.every((scope) => granted.has(scope));
}

export function integrationCapabilityRequiresApproval(capability: KivrynIntegrationCapability) {
  return KIVRYN_INTEGRATION_CAPABILITIES[capability].requiresApproval;
}
