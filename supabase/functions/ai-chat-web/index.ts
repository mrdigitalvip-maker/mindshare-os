import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders,
  jsonResponse,
  preflightResponse,
  rejectDisallowedOrigin,
} from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse(request);
  const rejected = rejectDisallowedOrigin(request);
  if (rejected) return rejected;
  if (request.method !== "POST") {
    return jsonResponse(request, { ok: false, error: { code: "invalid_request", message: "Method not allowed." } }, 405);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(request, { ok: false, error: { code: "unauthorized", message: "Sign in to use the assistant." } }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return jsonResponse(request, { ok: false, error: { code: "configuration_error", message: "The assistant is not configured." } }, 500);
  }

  const body = await request.text();
  let upstream: Response;
  try {
    upstream = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        apikey: anonKey,
        "Content-Type": request.headers.get("Content-Type") || "application/json",
        "x-client-info": "kivryn-web-ai-proxy/1",
      },
      body,
    });
  } catch {
    return jsonResponse(request, { ok: false, error: { code: "provider_unavailable", message: "The assistant is temporarily unavailable." } }, 503);
  }

  const headers = corsHeaders(request);
  headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  const responseBody = await upstream.text();
  return new Response(responseBody, { status: upstream.status, headers });
});
