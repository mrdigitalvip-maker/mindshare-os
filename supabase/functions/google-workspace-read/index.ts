import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, preflightResponse, rejectDisallowedOrigin } from "../_shared/http.ts";
import type { KivrynIntegrationCapability } from "../_shared/kivryn-integration-registry.ts";
import { safeProviderError } from "../_shared/creator-intelligence.ts";
import {
  resolveGoogleWorkspaceAccess,
  type GoogleWorkspaceProvider,
} from "../_shared/google-workspace-access.ts";
import { readGoogleWorkspaceItems } from "../_shared/google-workspace-read.ts";

const READ_CAPABILITY: Record<GoogleWorkspaceProvider, KivrynIntegrationCapability> = {
  gmail: "mail.read",
  google_calendar: "calendar.read",
  google_drive: "files.read",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse(request);
  const rejected = rejectDisallowedOrigin(request);
  if (rejected) return rejected;
  if (request.method !== "POST") {
    return jsonResponse(request, { error: { code: "method_not_allowed" } }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return jsonResponse(request, { error: { code: "configuration_error" } }, 503);
  }

  const auth = createClient(url, anon, {
    global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return jsonResponse(request, { error: { code: "unauthorized" } }, 401);

  const input = await request.json().catch(() => ({}));
  const provider = String(input.provider ?? "") as GoogleWorkspaceProvider;
  if (!["gmail", "google_calendar", "google_drive"].includes(provider)) {
    return jsonResponse(request, { error: { code: "unsupported_provider" } }, 400);
  }
  const limit = Math.max(1, Math.min(20, Number(input.limit) || 5));
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { accessToken } = await resolveGoogleWorkspaceAccess({
      admin,
      userId: user.id,
      provider,
      capability: READ_CAPABILITY[provider],
    });
    const items = await readGoogleWorkspaceItems({
      provider,
      accessToken,
      limit,
    });
    return jsonResponse(request, { provider, items }, 200);
  } catch (cause) {
    const error = cause as Error & { code?: string; providerStatus?: number };
    const code =
      error.code ??
      (error.providerStatus ? safeProviderError(error.providerStatus) : "workspace_read_failed");
    const status =
      code === "connection_required" || code === "insufficient_scope"
        ? 409
        : code === "credential_expired"
          ? 401
          : code === "provider_not_configured"
            ? 503
            : 502;
    return jsonResponse(request, { error: { code } }, status);
  }
});

