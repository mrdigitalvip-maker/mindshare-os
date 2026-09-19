import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  corsHeaders,
  jsonResponse,
  preflightResponse,
  rejectDisallowedOrigin,
} from "../_shared/http.ts";

const MAX_TEXT_LENGTH = 2500;
const MAX_AUDIO_BYTES = 6 * 1024 * 1024;
const SPEECH_TIMEOUT_MS = 20_000;
const TRANSCRIPTION_TIMEOUT_MS = 30_000;
const TRANSCRIPTION_MODEL =
  Deno.env.get("KIVRYN_VOICE_TRANSCRIPTION_MODEL") ?? "gpt-4o-mini-transcribe";
const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/flac",
  "audio/m4a",
  "audio/mp3",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "video/mp4",
]);
const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  "flac",
  "m4a",
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "ogg",
  "wav",
  "webm",
]);

type VoiceBody = {
  action?: string;
  text?: unknown;
  language?: unknown;
};

function normalizeLanguage(value: unknown): "pt" | "en" | "es" | "fr" | undefined {
  if (value === "pt" || value === "pt-BR") return "pt";
  if (value === "en" || value === "en-US") return "en";
  if (value === "es" || value === "es-ES") return "es";
  if (value === "fr" || value === "fr-FR") return "fr";
  return undefined;
}

function supportedAudio(file: File): boolean {
  const type = file.type.toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (SUPPORTED_AUDIO_TYPES.has(type)) return true;
  if ((!type || type === "application/octet-stream") && SUPPORTED_AUDIO_EXTENSIONS.has(extension)) {
    return true;
  }
  return false;
}

async function parseVoiceRequest(request: Request): Promise<{
  body: VoiceBody | null;
  audio: File | null;
}> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    if (!form) return { body: null, audio: null };
    const candidate = form.get("audio");
    return {
      body: {
        action: typeof form.get("action") === "string" ? String(form.get("action")) : undefined,
        language:
          typeof form.get("language") === "string" ? String(form.get("language")) : undefined,
      },
      audio: candidate instanceof File ? candidate : null,
    };
  }

  return {
    body: (await request.json().catch(() => null)) as VoiceBody | null,
    audio: null,
  };
}

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

  const { body, audio } = await parseVoiceRequest(request);

  const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
  const voiceId =
    Deno.env.get("ELEVENLABS_VOICE_ID") ?? Deno.env.get("ELEVENLABS_VOICE_ID_NEXORA");
  const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
  const speechConfigured = Boolean(elevenLabsApiKey && voiceId);
  const transcriptionConfigured = Boolean(openAiApiKey);
  const premiumOnly = Deno.env.get("KIVRYN_VOICE_PREMIUM_ONLY") === "true";

  let premiumActive = false;
  if (premiumOnly) {
    const { data, error } = await client
      .from("subscriptions")
      .select("status,current_period_end")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    premiumActive =
      !error &&
      (data?.status === "active" || data?.status === "trialing") &&
      (!data.current_period_end || new Date(data.current_period_end).getTime() > Date.now());
  }

  const entitled = !premiumOnly || premiumActive;

  if (body?.action === "availability") {
    return jsonResponse(request, {
      available: speechConfigured && entitled,
      speechAvailable: speechConfigured && entitled,
      transcriptionAvailable: transcriptionConfigured && entitled,
      premiumOnly,
    });
  }

  if (body?.action === "transcribe") {
    if (!entitled) return jsonResponse(request, { error: { code: "premium_required" } }, 403);
    if (!transcriptionConfigured)
      return jsonResponse(request, { error: { code: "provider_unavailable" } }, 503);
    if (!audio || audio.size <= 0 || audio.size > MAX_AUDIO_BYTES || !supportedAudio(audio)) {
      return jsonResponse(request, { error: { code: "invalid_audio" } }, 400);
    }

    const transcription = new FormData();
    transcription.append("file", audio, audio.name || "kivryn-voice.webm");
    transcription.append("model", TRANSCRIPTION_MODEL);
    transcription.append("response_format", "json");
    const language = normalizeLanguage(body.language);
    if (language) transcription.append("language", language);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);
    try {
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${openAiApiKey!}` },
        body: transcription,
      });
      if (!response.ok) {
        return jsonResponse(
          request,
          {
            error: {
              code: response.status === 429 ? "provider_rate_limited" : "provider_error",
            },
          },
          response.status === 429 ? 429 : 502,
        );
      }

      const payload = (await response.json().catch(() => null)) as { text?: unknown } | null;
      const text = typeof payload?.text === "string" ? payload.text.trim() : "";
      if (!text) return jsonResponse(request, { error: { code: "empty_transcription" } }, 502);
      return jsonResponse(request, {
        text,
        provider: "openai",
        model: TRANSCRIPTION_MODEL,
      });
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
  }

  if (body?.action !== "speak") {
    return jsonResponse(request, { error: { code: "invalid_request" } }, 400);
  }
  if (!entitled) return jsonResponse(request, { error: { code: "premium_required" } }, 403);
  if (!speechConfigured)
    return jsonResponse(request, { error: { code: "provider_unavailable" } }, 503);
  if (typeof body.text !== "string" || !body.text.trim() || body.text.length > MAX_TEXT_LENGTH) {
    return jsonResponse(request, { error: { code: "invalid_request" } }, 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SPEECH_TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "xi-api-key": elevenLabsApiKey!,
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: body.text.trim(),
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.46,
          similarity_boost: 0.8,
          style: 0.18,
          use_speaker_boost: true,
        },
      }),
    });
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
            error instanceof DOMException && error.name === "AbortError" ? "timeout" : "provider_error",
        },
      },
      502,
    );
  } finally {
    clearTimeout(timeout);
  }
});
