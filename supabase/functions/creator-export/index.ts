import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, preflightResponse, rejectDisallowedOrigin } from "../_shared/http.ts";

type ExportRequest = {
  clipId?: unknown;
  requestId?: unknown;
};

type FeatureQuota = {
  allowed?: boolean;
  entitlement?: "free" | "premium";
  unlimited?: boolean;
  limit?: number;
  used?: number;
  remaining?: number | null;
  resetAt?: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse(request);
  const rejected = rejectDisallowedOrigin(request);
  if (rejected) return rejected;
  if (request.method !== "POST") {
    return jsonResponse(request, { error: { code: "method_not_allowed" } }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse(request, { error: { code: "configuration_error" } }, 503);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const auth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return jsonResponse(request, { error: { code: "unauthorized" } }, 401);

  const body = (await request.json().catch(() => ({}))) as ExportRequest;
  const clipId = typeof body.clipId === "string" ? body.clipId.trim() : "";
  const requestId =
    typeof body.requestId === "string" && body.requestId.trim()
      ? body.requestId.trim().slice(0, 180)
      : crypto.randomUUID();
  if (!clipId) return jsonResponse(request, { error: { code: "clip_required" } }, 400);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: clip, error: clipError } = await admin
    .from("creator_clips")
    .select("id,user_id,project_id,output_path,render_status")
    .eq("id", clipId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (clipError) return jsonResponse(request, { error: { code: "clip_lookup_failed" } }, 500);
  if (!clip) return jsonResponse(request, { error: { code: "clip_not_found" } }, 404);
  if (clip.render_status !== "available" || !clip.output_path) {
    return jsonResponse(request, { error: { code: "clip_not_ready" } }, 409);
  }
  const expectedPrefix = `${user.id}/${clip.project_id}/`;
  if (!String(clip.output_path).startsWith(expectedPrefix)) {
    return jsonResponse(request, { error: { code: "invalid_output_path" } }, 409);
  }

  const { data: rawQuota, error: quotaError } = await auth.rpc("claim_feature_usage", {
    p_feature: "creator_export",
    p_request_id: `creator-export:${requestId}`,
  });
  if (quotaError) return jsonResponse(request, { error: { code: "quota_check_failed" } }, 500);
  const quota = (rawQuota ?? {}) as FeatureQuota;
  if (quota.allowed !== true) {
    return jsonResponse(
      request,
      {
        error: {
          code: "daily_limit_reached",
          message: "Daily Creator export limit reached.",
          quota,
        },
      },
      429,
    );
  }

  const { data: signed, error: signedError } = await admin.storage
    .from("creator-outputs")
    .createSignedUrl(clip.output_path, 300, { download: `kivryn-${clip.id}.mp4` });
  if (signedError || !signed?.signedUrl) {
    return jsonResponse(request, { error: { code: "export_url_failed" } }, 500);
  }

  return jsonResponse(request, {
    signedUrl: signed.signedUrl,
    fileName: `kivryn-${clip.id}.mp4`,
    expiresInSeconds: 300,
    quota,
  });
});
