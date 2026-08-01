import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

interface OpenAiAttempt {
  provider: "openai";
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
  console.log(JSON.stringify({ event, ...data }));
}

function snippet(text: string, max = 2000): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + `…[truncated ${text.length - max} chars]`;
}

async function callOpenAI(
  apiKey: string,
  messages: ChatMessage[],
): Promise<{ content: string; attempt: OpenAiAttempt }> {
  const model = "gpt-5";
  const url = "https://api.openai.com/v1/chat/completions";
  const attempt: OpenAiAttempt = {
    provider: "openai",
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
      log("openai_http_error", {
        status: response.status,
        model,
        body: attempt.bodySnippet,
        durationMs: attempt.durationMs,
      });
      throw new Error(attempt.errorMessage);
    }

    attempt.stage = "parse-json";
    const json = JSON.parse(raw);
    const text: string | undefined = json?.choices?.[0]?.message?.content;

    if (!text) {
      attempt.errorMessage = "No content in response";
      attempt.durationMs = Math.round(performance.now() - started);
      log("openai_empty_text", {
        model,
        body: attempt.bodySnippet,
        durationMs: attempt.durationMs,
      });
      throw new Error(attempt.errorMessage);
    }

    attempt.ok = true;
    attempt.stage = "done";
    attempt.durationMs = Math.round(performance.now() - started);
    log("openai_ok", {
      model,
      status: response.status,
      chars: text.length,
      durationMs: attempt.durationMs,
    });

    return { content: text, attempt };
  } catch (err) {
    attempt.durationMs = Math.round(performance.now() - started);
    attempt.errorMessage ??= err instanceof Error ? err.message : String(err);
    log("openai_exception", {
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
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      log("auth_invalid", { requestId, error: authError?.message });
      return Response.json({ error: "Invalid session" }, { status: 401, headers: CORS_HEADERS });
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages)) {
      log("bad_request", { requestId, userId: user.id });
      return Response.json({ error: "messages required" }, { status: 400, headers: CORS_HEADERS });
    }

    const messages = body.messages as ChatMessage[];
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openAiApiKey) {
      log("missing_openai_key", { requestId, userId: user.id });
      return Response.json(
        { error: "OpenAI secret is not configured" },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    log("request_ready", {
      requestId,
      userId: user.id,
      messageCount: messages.length,
    });

    try {
      const { content, attempt } = await callOpenAI(openAiApiKey, messages);

      log("request_ok", {
        requestId,
        provider: attempt.provider,
        model: attempt.model,
        totalMs: Math.round(performance.now() - requestStarted),
      });

      return Response.json(
        { provider: "openai", model: attempt.model, content },
        { headers: CORS_HEADERS },
      );
    } catch (err) {
      log("openai_failed", {
        requestId,
        error: err instanceof Error ? err.message : String(err),
        totalMs: Math.round(performance.now() - requestStarted),
      });

      return Response.json(
        {
          error: "AI request failed",
          provider: "openai",
          details: err instanceof Error ? err.message : String(err),
        },
        { status: 502, headers: CORS_HEADERS },
      );
    }
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
