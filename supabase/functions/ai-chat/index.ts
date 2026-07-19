// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

// AI gateway for the NEXORA Assistant.
// Tries Google AI Studio (Gemini) first, falls back to Grok (xAI) if it
// fails. Stateless — conversation persistence (ai_conversations/ai_messages)
// is the frontend's responsibility, done directly against Supabase so RLS
// stays the single source of truth for who can read/write what.
//
// Required secrets (Project Settings → Edge Functions → Secrets):
//   GOOGLE_AI_API_KEY
//   XAI_API_KEY

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ReqPayload {
  messages: ChatMessage[];
}

interface ProviderResult {
  content: string;
  provider: "gemini" | "grok";
}

function isValidPayload(value: unknown): value is ReqPayload {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.messages) || body.messages.length === 0) return false;
  return body.messages.every(
    (m) =>
      m &&
      typeof m === "object" &&
      typeof (m as ChatMessage).role === "string" &&
      typeof (m as ChatMessage).content === "string" &&
      (m as ChatMessage).content.trim().length > 0,
  );
}

/**
 * Calls Google AI Studio (Gemini). Model name is current as of this
 * writing — verify against https://ai.google.dev/gemini-api/docs/models
 * if this ever starts returning 404.
 */
async function callGemini(messages: ChatMessage[], apiKey: string): Promise<ProviderResult> {
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find((m) => m.role === "system")?.content;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        ...(systemInstruction
          ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
          : {}),
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini request failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Gemini returned an empty response");
  }

  return { content: text, provider: "gemini" };
}

/**
 * Calls Grok (xAI) via its OpenAI-compatible endpoint. Model name is
 * current as of this writing — verify against https://docs.x.ai if this
 * ever starts returning 404.
 */
async function callGrok(messages: ChatMessage[], apiKey: string): Promise<ProviderResult> {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4-fast",
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Grok request failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Grok returned an empty response");
  }

  return { content: text, provider: "grok" };
}

console.info("ai-chat function started");

export default {
  // auth: "user" requires a valid end-user JWT (the logged-in NEXORA
  // session). withSupabase validates it, builds an RLS-scoped
  // ctx.supabase, and handles CORS — none of that is done by hand here.
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!isValidPayload(payload)) {
      return Response.json(
        { error: "Body must include a non-empty `messages` array" },
        { status: 400 },
      );
    }

    const googleKey = Deno.env.get("GOOGLE_AI_API_KEY");
    const xaiKey = Deno.env.get("XAI_API_KEY");

    if (!googleKey && !xaiKey) {
      return Response.json({ error: "No AI provider configured" }, { status: 500 });
    }

    const errors: string[] = [];

    if (googleKey) {
      try {
        const result = await callGemini(payload.messages, googleKey);
        return Response.json(result);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Unknown Gemini error");
      }
    }

    if (xaiKey) {
      try {
        const result = await callGrok(payload.messages, xaiKey);
        return Response.json(result);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Unknown Grok error");
      }
    }

    return Response.json(
      { error: "All AI providers failed", details: errors },
      { status: 502 },
    );
  }),
};
