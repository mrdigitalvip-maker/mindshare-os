import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  jsonResponse,
  preflightResponse,
  rejectDisallowedOrigin,
} from "../_shared/http.ts";
import {
  safeProviderSnapshot,
} from "../_shared/kivryn-ai-provider-registry.ts";
import {
  KivrynGeminiError,
  runKivrynGeminiText,
} from "../_shared/kivryn-gemini.ts";

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

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
  };
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (body.action === "status" || !body.action) {
    return jsonResponse(request, {
      providers: {
        openai: safeProviderSnapshot("openai"),
        gemini: safeProviderSnapshot("gemini"),
      },
      policy: {
        openaiRemainsPrimary: true,
        clientProviderSelection: false,
        geminiLiveEnabled: false,
      },
    });
  }

  if (body.action !== "probe") {
    return jsonResponse(request, { error: { code: "invalid_request" } }, 400);
  }

  const { data: internal } = await admin
    .from("internal_access_overrides")
    .select("access_role,unlimited_ai,unlimited_product")
    .eq("user_id", user.id)
    .maybeSingle();
  if (
    !internal ||
    (internal.access_role !== "owner" && internal.access_role !== "tester") ||
    (internal.unlimited_ai !== true && internal.unlimited_product !== true)
  ) {
    return jsonResponse(request, { error: { code: "beta_access_required" } }, 403);
  }

  try {
    const result = await runKivrynGeminiText({
      admin,
      userId: user.id,
      requestId: crypto.randomUUID(),
      capability: "text",
      system:
        "You are a KIVRYN provider diagnostic. Reply exactly with KIVRYN_OK and nothing else.",
      text: "Provider health probe.",
    });
    return jsonResponse(request, {
      ok: result.output.trim() === "KIVRYN_OK",
      provider: result.provider,
      billingMode: result.billingMode,
    });
  } catch (error) {
    const code = error instanceof KivrynGeminiError ? error.code : "provider_error";
    const status =
      code === "provider_quota_limited"
        ? 429
        : code === "provider_not_configured"
          ? 503
          : code === "duplicate_request"
            ? 409
            : 502;
    return jsonResponse(request, { error: { code } }, status);
  }
});
