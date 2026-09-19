import {
  geminiBillingMode,
  type KivrynAiCapability,
} from "./kivryn-ai-provider-registry.ts";
import { normalizeAiProviderHttpError } from "./kivryn-ai-provider-router.ts";

type AdminClient = { from: (table: string) => any };

export class KivrynGeminiError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "KivrynGeminiError";
  }
}

function numberEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number.parseInt(Deno.env.get(name) ?? "", 10);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

function geminiCredential() {
  return Deno.env.get("GEMINI_AUTH_KEY") ?? Deno.env.get("GEMINI_API_KEY") ?? "";
}

function geminiModel() {
  return Deno.env.get("GEMINI_TEXT_MODEL")?.trim() ?? "";
}

function normalizedModelPath(model: string) {
  return model.startsWith("models/") ? model : `models/${model}`;
}

function timeoutMs() {
  return numberEnv("GEMINI_REQUEST_TIMEOUT_MS", 30_000, 5_000, 90_000);
}

function limits() {
  if (geminiBillingMode() === "paid") {
    return {
      daily: numberEnv("GEMINI_PAID_DAILY_REQUEST_LIMIT", 1000, 1, 100000),
      perMinute: numberEnv("GEMINI_PAID_RPM_LIMIT", 60, 1, 1000),
      maxInputChars: numberEnv("GEMINI_PAID_MAX_INPUT_CHARS", 40000, 1000, 200000),
    };
  }
  return {
    daily: numberEnv("GEMINI_FREE_DAILY_REQUEST_LIMIT", 25, 1, 500),
    perMinute: numberEnv("GEMINI_FREE_RPM_LIMIT", 4, 1, 60),
    maxInputChars: numberEnv("GEMINI_FREE_MAX_INPUT_CHARS", 12000, 500, 40000),
  };
}

async function countClaims(
  admin: AdminClient,
  userId: string,
  since: string,
) {
  const { count, error } = await admin
    .from("ai_provider_usage_claims")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("provider", "gemini")
    .gte("created_at", since);
  if (error) throw new KivrynGeminiError("usage_guard_unavailable");
  return count ?? 0;
}

async function beginClaim(input: {
  admin: AdminClient;
  userId: string;
  requestId: string;
  capability: KivrynAiCapability;
  model: string;
  inputChars: number;
}) {
  const policy = limits();
  if (input.inputChars > policy.maxInputChars) {
    throw new KivrynGeminiError("input_too_large");
  }

  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const [daily, minute] = await Promise.all([
    countClaims(input.admin, input.userId, startOfDay.toISOString()),
    countClaims(input.admin, input.userId, new Date(now - 60_000).toISOString()),
  ]);
  if (daily >= policy.daily || minute >= policy.perMinute) {
    throw new KivrynGeminiError("provider_quota_limited");
  }

  const billingMode = geminiBillingMode();
  const inserted = await input.admin
    .from("ai_provider_usage_claims")
    .insert({
      user_id: input.userId,
      provider: "gemini",
      capability: input.capability,
      billing_mode: billingMode,
      model: input.model,
      request_id: input.requestId,
      status: "started",
    })
    .select("id")
    .single();
  if (inserted.error) {
    if (inserted.error.code === "23505") throw new KivrynGeminiError("duplicate_request");
    throw new KivrynGeminiError("usage_guard_unavailable");
  }
  return String(inserted.data.id);
}

async function finishClaim(
  admin: AdminClient,
  claimId: string,
  values: {
    status: "completed" | "failed" | "quota_limited";
    latencyMs: number;
    inputUnits?: number;
    outputUnits?: number;
    errorCode?: string;
  },
) {
  await admin
    .from("ai_provider_usage_claims")
    .update({
      status: values.status,
      latency_ms: values.latencyMs,
      input_units: values.inputUnits ?? null,
      output_units: values.outputUnits ?? null,
      error_code: values.errorCode ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", claimId);
}

function outputText(payload: Record<string, unknown>) {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const first = candidates[0] as Record<string, unknown> | undefined;
  const content = first?.content as Record<string, unknown> | undefined;
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  return parts
    .map((part) =>
      part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string"
        ? String((part as Record<string, unknown>).text)
        : "",
    )
    .join("")
    .trim();
}

export async function runKivrynGeminiText(input: {
  admin: AdminClient;
  userId: string;
  requestId: string;
  text: string;
  system?: string;
  capability?: "text" | "reasoning";
}) {
  const credential = geminiCredential();
  const model = geminiModel();
  if (!credential || !model) throw new KivrynGeminiError("provider_not_configured");

  const text = input.text.trim();
  if (!text) throw new KivrynGeminiError("invalid_request");
  const capability = input.capability ?? "text";
  const claimId = await beginClaim({
    admin: input.admin,
    userId: input.userId,
    requestId: input.requestId,
    capability,
    model,
    inputChars: text.length + (input.system?.length ?? 0),
  });

  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${normalizedModelPath(model)}:generateContent`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "x-goog-api-key": credential,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...(input.system?.trim()
            ? { systemInstruction: { parts: [{ text: input.system.trim() }] } }
            : {}),
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
        }),
      },
    );

    if (!response.ok) {
      const code = normalizeAiProviderHttpError(response.status);
      await finishClaim(input.admin, claimId, {
        status: response.status === 429 ? "quota_limited" : "failed",
        latencyMs: Date.now() - startedAt,
        errorCode: code,
      });
      throw new KivrynGeminiError(code);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const output = outputText(payload);
    if (!output) {
      await finishClaim(input.admin, claimId, {
        status: "failed",
        latencyMs: Date.now() - startedAt,
        errorCode: "provider_empty_response",
      });
      throw new KivrynGeminiError("provider_empty_response");
    }

    const usage = payload.usageMetadata as Record<string, unknown> | undefined;
    await finishClaim(input.admin, claimId, {
      status: "completed",
      latencyMs: Date.now() - startedAt,
      inputUnits:
        typeof usage?.promptTokenCount === "number" ? usage.promptTokenCount : undefined,
      outputUnits:
        typeof usage?.candidatesTokenCount === "number"
          ? usage.candidatesTokenCount
          : undefined,
    });
    return { output, provider: "gemini" as const, model, billingMode: geminiBillingMode() };
  } catch (error) {
    if (error instanceof KivrynGeminiError) throw error;
    const code =
      error instanceof DOMException && error.name === "AbortError"
        ? "provider_timeout"
        : "provider_error";
    await finishClaim(input.admin, claimId, {
      status: "failed",
      latencyMs: Date.now() - startedAt,
      errorCode: code,
    });
    throw new KivrynGeminiError(code);
  } finally {
    clearTimeout(timer);
  }
}
