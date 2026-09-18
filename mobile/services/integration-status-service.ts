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
