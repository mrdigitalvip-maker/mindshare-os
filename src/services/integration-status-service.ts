import { supabase } from "@/lib/supabase";

export type IntegrationProviderStatus = {
  provider:
    | "youtube"
    | "tiktok"
    | "instagram"
    | "gmail"
    | "google_calendar"
    | "google_drive"
    | "slack"
    | "whatsapp";
  implemented: boolean;
  readiness: "configuration_required" | "app_review_required" | "coming_soon";
  authMode: "oauth" | "unconfigured";
  credentialBoundary: "server_only";
  capabilities: string[];
  availableCapabilities: string[];
  runtimeConfigured: boolean;
  connectionStatus: string;
  connectionState:
    | "not_connected"
    | "connected"
    | "needs_permission"
    | "expired"
    | "disconnected"
    | "error"
    | string;
  connectionId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  lastSuccessAt: string | null;
  safeErrorCode: string | null;
  grantedScopes: string[];
  canConnect: boolean;
};

export async function listIntegrationReadiness(): Promise<IntegrationProviderStatus[]> {
  const { data, error } = await supabase.functions.invoke<{ providers?: IntegrationProviderStatus[] }>(
    "integration-status",
    { body: {} },
  );
  if (error) throw error;
  return data?.providers ?? [];
}


export type GoogleWorkspaceProvider = "gmail" | "google_calendar" | "google_drive";

export type GoogleWorkspaceItem = Record<string, unknown> & { id: string };

export async function startIntegrationConnection(input: {
  provider: GoogleWorkspaceProvider;
  redirectUri: string;
}) {
  const { data, error } = await supabase.functions.invoke<{
    authorizationUrl?: string;
    status?: string;
  }>("creator-oauth-start", {
    body: { provider: input.provider, redirectUri: input.redirectUri },
  });
  if (error || !data?.authorizationUrl) {
    throw error ?? new Error("Integration connection is unavailable.");
  }
  return data.authorizationUrl;
}

export async function readGoogleWorkspace(
  provider: GoogleWorkspaceProvider,
  limit = 5,
): Promise<GoogleWorkspaceItem[]> {
  const { data, error } = await supabase.functions.invoke<{
    provider?: GoogleWorkspaceProvider;
    items?: GoogleWorkspaceItem[];
    error?: { code?: string };
  }>("google-workspace-read", {
    body: { provider, limit },
  });
  if (error) throw error;
  if (data?.error?.code) throw new Error(data.error.code);
  return data?.items ?? [];
}
