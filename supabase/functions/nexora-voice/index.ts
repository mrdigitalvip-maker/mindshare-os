import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  corsHeaders,
  jsonResponse,
  preflightResponse,
  rejectDisallowedOrigin,
} from "../_shared/http.ts";

const MAX_TEXT_LENGTH = 2500;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse(request);
  const rejected = rejectDisallowedOrigin(request);
  if (rejected) return rejected;
  if (request.method !== "POST")
    return jsonResponse(request, { error: { code: "method_not_allowed" } }, 405);
  const authorization = request.headers.get("Authorization");
  if (!authorization) return jsonResponse(request, { error: { code: "unauthorized" } }, 401);
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
  });
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) return jsonResponse(request, { error: { code: "unauthorized" } }, 401);
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    text?: unknown;
  } | null;
  const configured = Boolean(
    Deno.env.get("ELEVENLABS_API_KEY") && Deno.env.get("ELEVENLABS_VOICE_ID_NEXORA"),
  );
  const { data, error } = await client
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const active =
    !error &&
    (data?.status === "active" || data?.status === "trialing") &&
    (!data.current_period_end || new Date(data.current_period_end).getTime() > Date.now());
  if (body?.action === "availability")
    return jsonResponse(request, { available: configured && active });
  if (!configured) return jsonResponse(request, { error: { code: "provider_unavailable" } }, 503);
  if (!active) return jsonResponse(request, { error: { code: "premium_required" } }, 403);
  if (
    body?.action !== "speak" ||
    typeof body.text !== "string" ||
    !body.text.trim() ||
    body.text.length > MAX_TEXT_LENGTH
  )
    return jsonResponse(request, { error: { code: "invalid_request" } }, 400);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${Deno.env.get("ELEVENLABS_VOICE_ID_NEXORA")}`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "xi-api-key": Deno.env.get("ELEVENLABS_API_KEY")!,
          "content-type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({ text: body.text.trim(), model_id: "eleven_multilingual_v2" }),
      },
    );
    if (!response.ok || !response.body)
      return jsonResponse(
        request,
        { error: { code: response.status === 429 ? "provider_rate_limited" : "provider_error" } },
        response.status === 429 ? 429 : 502,
      );
    const headers = corsHeaders(request);
    headers.set("Content-Type", "audio/mpeg");
    headers.set("Cache-Control", "no-store");
    return new Response(response.body, { status: 200, headers });
  } catch (error) {
    return jsonResponse(
      request,
      {
        error: {
          code:
            error instanceof DOMException && error.name === "AbortError"
              ? "timeout"
              : "provider_error",
        },
      },
      502,
    );
  } finally {
    clearTimeout(timeout);
  }
});
