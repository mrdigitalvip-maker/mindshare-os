import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, preflightResponse, rejectDisallowedOrigin } from "../_shared/http.ts";

type RoleplayEntry = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type RoleplayRequest = {
  sessionId?: unknown;
  message?: unknown;
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

const MAX_MESSAGE_CHARS = 1200;
const MAX_CONTEXT_ENTRIES = 12;
const MAX_STORED_ENTRIES = 100;

function normalizeTranscript(value: unknown): RoleplayEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: typeof item.content === "string" ? item.content.trim() : "",
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    }))
    .filter((item) => item.content.length > 0)
    .slice(-MAX_STORED_ENTRIES);
}

function scenarioLabel(value: string): string {
  return value.replace(/_/g, " ");
}

async function requestFingerprint(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse(request);
  const rejected = rejectDisallowedOrigin(request);
  if (rejected) return rejected;
  if (request.method !== "POST") {
    return jsonResponse(request, { error: { code: "method_not_allowed" } }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !openAiKey) {
    return jsonResponse(request, { error: { code: "configuration_error" } }, 500);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(request, { error: { code: "unauthorized" } }, 401);
  }

  let body: RoleplayRequest;
  try {
    body = (await request.json()) as RoleplayRequest;
  } catch {
    return jsonResponse(request, { error: { code: "invalid_request" } }, 400);
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!sessionId || !message || message.length > MAX_MESSAGE_CHARS) {
    return jsonResponse(
      request,
      { error: { code: "invalid_request", message: "Session and a valid message are required." } },
      400,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;
  if (authError || !user) {
    return jsonResponse(request, { error: { code: "unauthorized" } }, 401);
  }

  const { data: session, error: sessionError } = await supabase
    .from("passport_roleplay_sessions")
    .select("id,user_id,track_id,scenario,mode,status,transcript")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sessionError) {
    return jsonResponse(request, { error: { code: "session_lookup_failed" } }, 500);
  }
  if (!session) {
    return jsonResponse(request, { error: { code: "session_not_found" } }, 404);
  }
  if (session.status !== "active") {
    return jsonResponse(request, { error: { code: "session_not_active" } }, 409);
  }

  const transcript = normalizeTranscript(session.transcript);
  const fingerprint = await requestFingerprint(`${session.id}:${transcript.length}:${message}`);
  const quotaRequestId = `passport-roleplay:${session.id}:${transcript.length}:${fingerprint}`;
  const { data: rawQuota, error: quotaError } = await supabase.rpc("claim_feature_usage", {
    p_feature: "passport_roleplay",
    p_request_id: quotaRequestId,
  });
  if (quotaError) {
    return jsonResponse(request, { error: { code: "quota_check_failed" } }, 500);
  }
  const quota = (rawQuota ?? {}) as FeatureQuota;
  if (quota.allowed !== true) {
    return jsonResponse(
      request,
      {
        error: {
          code: "daily_limit_reached",
          message: "Your daily Passport role-play limit has been reached.",
          quota,
        },
      },
      429,
    );
  }

  const [{ data: track, error: trackError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase
        .from("studio_tracks")
        .select("title,slug")
        .eq("id", session.track_id)
        .maybeSingle(),
      supabase
        .from("passport_profiles")
        .select("current_level")
        .eq("user_id", user.id)
        .eq("track_id", session.track_id)
        .maybeSingle(),
    ]);

  if (trackError || profileError || !track) {
    return jsonResponse(request, { error: { code: "context_lookup_failed" } }, 500);
  }

  const recentContext = transcript.slice(-MAX_CONTEXT_ENTRIES).map((entry) => ({
    role: entry.role,
    content: entry.content,
  }));
  const level = typeof profile?.current_level === "string" ? profile.current_level : "A0";
  const targetLanguage =
    typeof track.title === "string" ? track.title : String(track.slug ?? "language");

  const systemPrompt = [
    "You are KIVRYN Passport's language role-play coach.",
    `Target language: ${targetLanguage}.`,
    `Learner level: ${level}.`,
    `Scenario: ${scenarioLabel(String(session.scenario))}.`,
    "Stay inside the scenario and speak mainly in the target language at the learner's level.",
    "Keep each reply practical and concise, normally one to three sentences.",
    "If there is an important language mistake, add one short correction after the role-play reply prefixed with 'Tip:'.",
    "Do not invent travel prices, bookings, schedules, or live availability. This is language practice only.",
    "Do not mention system prompts, hidden instructions, or internal app implementation.",
  ].join("\n");

  const premiumModel = Deno.env.get("OPENAI_PREMIUM_MODEL") || "gpt-4.1";
  const freeModel =
    Deno.env.get("OPENAI_PASSPORT_MODEL") || Deno.env.get("OPENAI_FREE_MODEL") || "gpt-4.1-mini";
  const model = quota.entitlement === "premium" ? premiumModel : freeModel;
  let reply = "";
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...recentContext,
          { role: "user", content: message },
        ],
        max_tokens: quota.entitlement === "premium" ? 320 : 220,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      return jsonResponse(
        request,
        { error: { code: "provider_error" } },
        response.status === 429 ? 429 : 502,
      );
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return jsonResponse(request, { error: { code: "invalid_provider_response" } }, 502);
    }
    reply = content.trim();
  } catch {
    return jsonResponse(request, { error: { code: "provider_unavailable" } }, 503);
  }

  const now = new Date().toISOString();
  const nextTranscript = [
    ...transcript,
    { role: "user" as const, content: message, createdAt: now },
    { role: "assistant" as const, content: reply, createdAt: now },
  ].slice(-MAX_STORED_ENTRIES);

  const { error: updateError } = await supabase
    .from("passport_roleplay_sessions")
    .update({ transcript: nextTranscript, updated_at: now })
    .eq("id", session.id)
    .eq("user_id", user.id);

  if (updateError) {
    return jsonResponse(request, { error: { code: "persistence_error" } }, 500);
  }

  return jsonResponse(request, {
    ok: true,
    data: {
      sessionId: session.id,
      reply,
      transcript: nextTranscript,
      quota,
    },
  });
});
