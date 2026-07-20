// NEXORA Assistant — AI gateway Edge Function.
//
// Contract (unchanged, so the frontend keeps working):
//   POST { messages: [{ role: "user"|"assistant"|"system", content: string }] }
//   ->   { content: string, provider: "gemini" | "grok" }
//
// Tries Gemini first, falls back to Grok. On explicit Gemini failure it
// still tries Grok; if Grok is the only one configured, it is used directly.
// Every step is logged so failures are visible in `supabase functions logs`.

// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

/** Reads the first env var that is set among the given names. */
function readEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = Deno.env.get(n);
    if (v && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

async function callGemini(
  messages: ChatMessage[],
  apiKey: string,
): Promise<string> {
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  const systemInstruction = messages.find((m) => m.role === "system")?.content;

  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
  console.log("[ai-chat] -> Gemini", endpoint);

  const res = await fetch(`${endpoint}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      ...(systemInstruction
        ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
        : {}),
    }),
  });

  const raw = await res.text();
  console.log("[ai-chat] Gemini status", res.status, "body", raw.slice(0, 400));

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${raw.slice(0, 300)}`);

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Gemini returned non-JSON response");
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Gemini returned an empty response");
  }
  return text;
}

async function callGrok(
  messages: ChatMessage[],
  apiKey: string,
): Promise<string> {
  const endpoint = "https://api.x.ai/v1/chat/completions";
  console.log("[ai-chat] -> Grok", endpoint);

  const res = await fetch(endpoint, {
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

  const raw = await res.text();
  console.log("[ai-chat] Grok status", res.status, "body", raw.slice(0, 400));

  if (!res.ok) throw new Error(`Grok ${res.status}: ${raw.slice(0, 300)}`);

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Grok returned non-JSON response");
  }
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Grok returned an empty response");
  }
  return text;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  console.log("[ai-chat] request received");

  let payload: { messages?: ChatMessage[] };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  const valid =
    messages.length > 0 &&
    messages.every(
      (m) =>
        m &&
        typeof m.role === "string" &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    );
  if (!valid) {
    return json(
      { error: "Body must include a non-empty `messages` array" },
      400,
    );
  }

  // Support several possible secret names so whichever the user configured
  // works out of the box.
  const geminiKey = readEnv(
    "GOOGLE_AI_API_KEY",
    "GOOGLE_API_KEY",
    "GEMINI_API_KEY",
  );
  const grokKey = readEnv("XAI_API_KEY", "GROK_API_KEY");

  console.log(
    "[ai-chat] keys present -> gemini:",
    !!geminiKey,
    "grok:",
    !!grokKey,
  );

  if (!geminiKey && !grokKey) {
    return json(
      {
        error:
          "No AI provider configured. Set GOOGLE_AI_API_KEY and/or XAI_API_KEY in Edge Function secrets.",
      },
      500,
    );
  }

  const errors: string[] = [];

  // Try Gemini first, then Grok. If Gemini isn't configured, go straight to Grok.
  if (geminiKey) {
    try {
      const content = await callGemini(messages, geminiKey);
      return json({ content, provider: "gemini" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[ai-chat] Gemini failed:", msg);
      errors.push(`gemini: ${msg}`);
    }
  }

  if (grokKey) {
    try {
      const content = await callGrok(messages, grokKey);
      return json({ content, provider: "grok" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[ai-chat] Grok failed:", msg);
      errors.push(`grok: ${msg}`);
    }
  }

  return json(
    { error: "All AI providers failed", details: errors },
    502,
  );
});
