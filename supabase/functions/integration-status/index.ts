import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, preflightResponse } from "../_shared/http.ts";
import {
  KIVRYN_INTEGRATION_PROVIDERS,
  type KivrynIntegrationProvider,
} from "../_shared/kivryn-integration-registry.ts";

const runtimeConfigured = (provider: KivrynIntegrationProvider) => {
  if (provider === "youtube") {
    return Boolean(Deno.env.get("YOUTUBE_CLIENT_ID") && Deno.env.get("YOUTUBE_CLIENT_SECRET"));
  }
  if (provider === "tiktok") {
    return Boolean(Deno.env.get("TIKTOK_CLIENT_KEY") && Deno.env.get("TIKTOK_CLIENT_SECRET"));
  }
  if (
    provider === "gmail" ||
    provider === "google_calendar" ||
    provider === "google_drive"
  ) {
    const clientId = Deno.env.get("GOOGLE_WORKSPACE_CLIENT_ID") ?? Deno.env.get("YOUTUBE_CLIENT_ID");
    const clientSecret =
      Deno.env.get("GOOGLE_WORKSPACE_CLIENT_SECRET") ?? Deno.env.get("YOUTUBE_CLIENT_SECRET");
    return Boolean(clientId && clientSecret);
  }
  return false;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  if (!["GET", "POST"].includes(req.method)) {
    return jsonResponse(req, { error: { code: "method_not_allowed" } }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return jsonResponse(req, { error: { code: "configuration_error" } }, 500);

  const client = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) return jsonResponse(req, { error: { code: "unauthorized" } }, 401);

  const { data: rows, error } = await client
    .from("creator_platform_connections")
    .select(
      "id,platform,status,provider_display_name,provider_avatar_url,last_success_at,safe_error_code,granted_scopes",
    )
    .eq("user_id", user.id);
  if (error) return jsonResponse(req, { error: { code: "connections_unavailable" } }, 500);

  const byProvider = new Map((rows ?? []).map((row) => [String(row.platform), row]));
  const providers = Object.values(KIVRYN_INTEGRATION_PROVIDERS).map((definition) => {
    const connection = byProvider.get(definition.provider) as
      | {
          id?: string;
          status?: string;
          provider_display_name?: string | null;
          provider_avatar_url?: string | null;
          last_success_at?: string | null;
          safe_error_code?: string | null;
          granted_scopes?: string[] | null;
        }
      | undefined;
    const configured = runtimeConfigured(definition.provider);
    const grantedScopes = Array.isArray(connection?.granted_scopes)
      ? connection?.granted_scopes.map(String)
      : [];
    const availableCapabilities = definition.capabilities.filter((capability) => {
      const required = definition.capabilityScopes[capability] ?? [];
      return required.length > 0 && required.every((scope) => grantedScopes.includes(scope));
    });
    const safeErrorCode = connection?.safe_error_code ?? null;
    const connectionState =
      safeErrorCode === "insufficient_scope"
        ? "needs_permission"
        : connection?.status === "expired"
          ? "expired"
          : connection?.status === "error"
            ? "error"
            : connection?.status === "revoked"
              ? "disconnected"
              : connection?.status === "connected"
                ? "connected"
                : connection?.status ?? "not_connected";
    return {
      provider: definition.provider,
      implemented: definition.implemented,
      readiness: definition.readiness,
      authMode: definition.authMode,
      credentialBoundary: definition.credentialBoundary,
      capabilities: definition.capabilities,
      availableCapabilities,
      runtimeConfigured: configured,
      connectionStatus: connection?.status ?? "not_connected",
      connectionState,
      connectionId: connection?.id ?? null,
      displayName: connection?.provider_display_name ?? null,
      avatarUrl: connection?.provider_avatar_url ?? null,
      lastSuccessAt: connection?.last_success_at ?? null,
      safeErrorCode,
      grantedScopes,
      canConnect: definition.implemented && definition.authMode === "oauth" && configured,
    };
  });

  return jsonResponse(req, { providers });
});
