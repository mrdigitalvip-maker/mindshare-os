import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

interface ProviderAttempt {
  provider: "gemini" | "grok";
  url: string;
  model: string;
  status?: number;
  ok: boolean;
  durationMs: number;
  stage: string;
  errorMessage?: string;
  bodySnippet?: string;
}

function log(event: string, data: Record<string, unknown> = {}) {
  // Structured log line — never logs API keys.
  console.log(JSON.stringify({ event, ...data }));
}

function snippet(text: string, max = 2000): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + `…[truncated ${text.length - max} chars]`;
}

async function callGemini(
  apiKey: string,
  messages: ChatMessage[],
): Promise<{ content: string; attempt: ProviderAttempt }> {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const attempt: ProviderAttempt = {
    provider: "gemini",
    url,
    model,
    ok: false,
    durationMs: 0,
    stage: "init",
  };
  const started = performance.now();

  try {
    // Extract a leading system message (if any) — Gemini uses systemInstruction.
    const systemMsg = messages.find((m) => m.role === "system");
    const convo = messages.filter((m) => m.role !== "system");

    const payload: Record<string, unknown> = {
      contents: convo.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        // Disable "thinking" tokens on 2.5 models — otherwise reasoning
        // consumes the entire token budget and parts[] arrives empty.
        thinkingConfig: { thinkingBudget: 0 },
      },
    };
    if (systemMsg) {
      payload.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    attempt.stage = "fetch";
    const response = await fetch(`${url}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    attempt.status = response.status;

    attempt.stage = "read-body";
    const raw = await response.text();
    attempt.bodySnippet = snippet(raw);

    if (!response.ok) {
      attempt.errorMessage = `HTTP ${response.status}`;
      attempt.durationMs = Math.round(performance.now() - started);
      log("gemini_http_error", {
        status: response.status,
        model,
        body: attempt.bodySnippet,
        durationMs: attempt.durationMs,
      });
      throw new Error(attempt.errorMessage);
    }

    attempt.stage = "parse-json";
    const json = JSON.parse(raw);

    attempt.stage = "extract-text";
    const candidate = json?.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const text = parts
      .map((p: { text?: string }) => (typeof p?.text === "string" ? p.text : ""))
      .join("")
      .trim();

    if (!text) {
      attempt.errorMessage = `No text in response (finishReason=${candidate?.finishReason ?? "unknown"})`;
      attempt.durationMs = Math.round(performance.now() - started);
      log("gemini_empty_text", {
        model,
        finishReason: candidate?.finishReason,
        safetyRatings: candidate?.safetyRatings,
        promptFeedback: json?.promptFeedback,
        durationMs: attempt.durationMs,
      });
      throw new Error(attempt.errorMessage);
    }

    attempt.ok = true;
    attempt.stage = "done";
    attempt.durationMs = Math.round(performance.now() - started);
    log("gemini_ok", {
      model,
      status: response.status,
      chars: text.length,
      durationMs: attempt.durationMs,
    });
    return { content: text, attempt };
  } catch (err) {
    attempt.durationMs = Math.round(performance.now() - started);
    attempt.errorMessage ??= err instanceof Error ? err.message : String(err);
    log("gemini_exception", {
      stage: attempt.stage,
      error: attempt.errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      durationMs: attempt.durationMs,
    });
    throw err;
  }
}

async function callGrok(
  apiKey: string,
  messages: ChatMessage[],
): Promise<{ content: string; attempt: ProviderAttempt }> {
  const model = "grok-3-latest";
  const url = "https://api.x.ai/v1/chat/completions";
  const attempt: ProviderAttempt = {
    provider: "grok",
    url,
    model,
    ok: false,
    durationMs: 0,
    stage: "init",
  };
  const started = performance.now();

  try {
    attempt.stage = "fetch";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    });
    attempt.status = response.status;

    attempt.stage = "read-body";
    const raw = await response.text();
    attempt.bodySnippet = snippet(raw);

    if (!response.ok) {
      attempt.errorMessage = `HTTP ${response.status}`;
      attempt.durationMs = Math.round(performance.now() - started);
      log("grok_http_error", {
        status: response.status,
        model,
        body: attempt.bodySnippet,
        durationMs: attempt.durationMs,
      });
      throw new Error(attempt.errorMessage);
    }

    attempt.stage = "parse-json";
    const json = JSON.parse(raw);

    attempt.stage = "extract-text";
    const text: string | undefined = json?.choices?.[0]?.message?.content;
    if (!text) {
      attempt.errorMessage = "No content in response";
      attempt.durationMs = Math.round(performance.now() - started);
      log("grok_empty_text", {
        model,
        body: attempt.bodySnippet,
        durationMs: attempt.durationMs,
      });
      throw new Error(attempt.errorMessage);
    }

    attempt.ok = true;
    attempt.stage = "done";
    attempt.durationMs = Math.round(performance.now() - started);
    log("grok_ok", {
      model,
      status: response.status,
      chars: text.length,
      durationMs: attempt.durationMs,
    });
    return { content: text, attempt };
  } catch (err) {
    attempt.durationMs = Math.round(performance.now() - started);
    attempt.errorMessage ??= err instanceof Error ? err.message : String(err);
    log("grok_exception", {
      stage: attempt.stage,
      error: attempt.errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      durationMs: attempt.durationMs,
    });
    throw err;
  }
}

Deno.serve(async (req) => {
  const requestStarted = performance.now();
  const requestId = crypto.randomUUID();

  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: CORS_HEADERS });
    }

    log("request_start", { requestId, method: req.method });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      log("auth_missing", { requestId });
      return Response.json(
        { error: "Unauthorized" },
        { status: 401, headers: CORS_HEADERS },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      log("auth_invalid", { requestId, error: authError?.message });
      return Response.json(
        { error: "Invalid session" },
        { status: 401, headers: CORS_HEADERS },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages)) {
      log("bad_request", { requestId, userId: user.id });
      return Response.json(
        { error: "messages required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const messages = body.messages as ChatMessage[];
    log("request_ready", {
      requestId,
      userId: user.id,
      messageCount: messages.length,
    });

    const GOOGLE_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    const XAI_KEY = Deno.env.get("XAI_API_KEY");

    if (!GOOGLE_KEY && !XAI_KEY) {
      log("no_keys_configured", { requestId });
      return Response.json(
        { error: "No AI keys configured" },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    const attempts: ProviderAttempt[] = [];

    // -------- Gemini (primary) --------
    if (GOOGLE_KEY) {
      try {
        const { content, attempt } = await callGemini(GOOGLE_KEY, messages);
        attempts.push(attempt);
        log("request_ok", {
          requestId,
          provider: "gemini",
          totalMs: Math.round(performance.now() - requestStarted),
        });
        return Response.json(
          { provider: "gemini", content },
          { headers: CORS_HEADERS },
        );
      } catch (err) {
        attempts.push({
          provider: "gemini",
          url: "",
          model: "gemini-2.5-flash",
          ok: false,
          durationMs: 0,
          stage: "caught",
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      log("gemini_skipped_no_key", { requestId });
    }

    // -------- Grok (fallback) --------
    if (XAI_KEY) {
      try {
        const { content, attempt } = await callGrok(XAI_KEY, messages);
        attempts.push(attempt);
        log("request_ok", {
          requestId,
          provider: "grok",
          totalMs: Math.round(performance.now() - requestStarted),
        });
        return Response.json(
          { provider: "grok", content },
          { headers: CORS_HEADERS },
        );
      } catch (err) {
        attempts.push({
          provider: "grok",
          url: "",
          model: "grok-3-latest",
          ok: false,
          durationMs: 0,
          stage: "caught",
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      log("grok_skipped_no_key", { requestId });
    }

    // All providers failed — return diagnostic detail (no keys, no PII).
    log("all_providers_failed", {
      requestId,
      attempts,
      totalMs: Math.round(performance.now() - requestStarted),
    });
    return Response.json(
      {
        error: "All AI providers failed",
        attempts: attempts.map((a) => ({
          provider: a.provider,
          model: a.model,
          status: a.status,
          stage: a.stage,
          errorMessage: a.errorMessage,
          durationMs: a.durationMs,
        })),
      },
      { status: 502, headers: CORS_HEADERS },
    );
  } catch (err) {
    log("fatal", {
      requestId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: CORS_HEADERS },
    );
  }
});
