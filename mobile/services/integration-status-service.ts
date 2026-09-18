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
  runtimeConfigured: boolean;
  connectionStatus: string;
  connectionId: string | null;
  displayName: string | null;
  lastSuccessAt: string | null;
  canConnect: boolean;
};

export async function listIntegrationReadiness(): Promise<IntegrationProviderStatus[]> {
  const { data, error } = await supabase.functions.invoke("integration-status", { body: {} });
  if (error) throw error;
  const payload = data as { providers?: IntegrationProviderStatus[] } | null;
  return payload?.providers ?? [];
}


export type GoogleWorkspaceProvider = "gmail" | "google_calendar" | "google_drive";

export type GoogleWorkspaceItem = Record<string, unknown> & { id: string };

export async function startIntegrationConnection(input: {
  provider: GoogleWorkspaceProvider;
  redirectUri: string;
}) {
  const { data, error } = await supabase.functions.invoke("creator-oauth-start", {
    body: { provider: input.provider, redirectUri: input.redirectUri },
  });
  if (error) throw error;
  const payload = data as { authorizationUrl?: string; status?: string } | null;
  if (!payload?.authorizationUrl) throw new Error("Integration connection is unavailable.");
  return payload.authorizationUrl;
}

export async function readGoogleWorkspace(
  provider: GoogleWorkspaceProvider,
  limit = 5,
): Promise<GoogleWorkspaceItem[]> {
  const { data, error } = await supabase.functions.invoke("google-workspace-read", {
    body: { provider, limit },
  });
  if (error) throw error;
  const payload = data as {
    provider?: GoogleWorkspaceProvider;
    items?: GoogleWorkspaceItem[];
    error?: { code?: string };
  } | null;
  if (payload?.error?.code) throw new Error(payload.error.code);
  return payload?.items ?? [];
}
