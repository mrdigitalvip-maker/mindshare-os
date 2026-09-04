import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, preflightResponse, rejectDisallowedOrigin } from "../_shared/http.ts";
import { decryptServerSecret, safeProviderError } from "../_shared/creator-intelligence.ts";
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse(request);
  const rejected = rejectDisallowedOrigin(request);
  if (rejected) return rejected;
  const url = Deno.env.get("SUPABASE_URL"),
    anon = Deno.env.get("SUPABASE_ANON_KEY"),
    service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service)
    return jsonResponse({ error: "configuration_error" }, 503, request);
  const auth = createClient(url, anon, {
    global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } },
  });
  const {
    data: { user },
  } = await auth.auth.getUser();
  const scheduler =
    request.headers.get("x-scheduler-secret") === Deno.env.get("CREATOR_SYNC_SCHEDULER_SECRET");
  if (!user && !scheduler) return jsonResponse({ error: "unauthorized" }, 401, request);
  const input = await request.json().catch(() => ({})),
    admin = createClient(url, service),
    userId = user?.id ?? input.userId;
  if (!userId) return jsonResponse({ error: "invalid_request" }, 400, request);
  if (input.action === "delete") {
    await admin
      .from("creator_platform_connections")
      .delete()
      .eq("user_id", userId)
      .eq("id", input.connectionId);
    return jsonResponse({ deleted: true }, 200, request);
  }
  if (input.action === "disconnect") {
    const { data: row } = await admin
      .from("creator_platform_connections")
      .select("id")
      .eq("id", input.connectionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) return jsonResponse({ error: "not_found" }, 404, request);
    await admin.from("creator_provider_credentials").delete().eq("connection_id", row.id);
    await admin
      .from("creator_platform_connections")
      .update({
        status: "revoked",
        disconnected_at: new Date().toISOString(),
        next_allowed_at: null,
      })
      .eq("id", row.id);
    return jsonResponse({ status: "revoked", historyRetained: true }, 200, request);
  }
  const { data: connections } = await admin
    .from("creator_platform_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "connected");
  let synced = 0;
  for (const connection of connections ?? []) {
    if (connection.next_allowed_at && Date.parse(connection.next_allowed_at) > Date.now()) continue;
    const now = new Date().toISOString();
    await admin
      .from("creator_platform_connections")
      .update({
        last_attempt_at: now,
        next_allowed_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      })
      .eq("id", connection.id);
    const { data: credential } = await admin
      .from("creator_provider_credentials")
      .select("access_token_ciphertext,expires_at")
      .eq("connection_id", connection.id)
      .maybeSingle();
    if (!credential || (credential.expires_at && Date.parse(credential.expires_at) <= Date.now())) {
      await admin
        .from("creator_platform_connections")
        .update({ status: "expired", safe_error_code: "credential_expired" })
        .eq("id", connection.id);
      continue;
    }
    try {
      const access = await decryptServerSecret(credential.access_token_ciphertext);
      const endpoint =
        connection.platform === "youtube"
          ? "https://www.googleapis.com/youtube/v3/videos?part=id,snippet,statistics&mine=true"
          : connection.platform === "tiktok"
            ? "https://open.tiktokapis.com/v2/video/list/?fields=id,title,create_time,view_count,like_count,comment_count,share_count"
            : "";
      if (!endpoint) continue;
      const response = await fetch(endpoint, {
        method: connection.platform === "tiktok" ? "POST" : "GET",
        headers: { Authorization: `Bearer ${access}`, "content-type": "application/json" },
        body: connection.platform === "tiktok" ? JSON.stringify({ max_count: 20 }) : undefined,
      });
      if (!response.ok) {
        await admin
          .from("creator_platform_connections")
          .update({
            safe_error_code: safeProviderError(response.status),
            status: response.status === 401 ? "expired" : "error",
          })
          .eq("id", connection.id);
        continue;
      }
      // Provider payload is normalized and persisted by a future provider-specific parser version; never store unknown fields as metrics.
      await response.json();
      await admin
        .from("creator_platform_connections")
        .update({ last_success_at: now, safe_error_code: null })
        .eq("id", connection.id);
      synced++;
    } catch {
      await admin
        .from("creator_platform_connections")
        .update({ safe_error_code: "provider_request_failed" })
        .eq("id", connection.id);
    }
  }
  return jsonResponse({ synced }, 200, request);
});
