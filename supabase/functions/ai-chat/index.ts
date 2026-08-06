import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" };

type ErrorCode =
  | "unauthorized"
  | "invalid_request"
  | "free_limit_reached"
  | "premium_limit_reached"
  | "input_too_large"
  | "provider_unavailable"
  | "provider_rate_limited"
  | "provider_error"
  | "persistence_error"
  | "configuration_error";
type Plan = "free" | "premium";
type DbClient = ReturnType<typeof createClient>;

interface PlanPolicy {
  dailyMessages: number;
  maxInputChars: number;
  maxOutputTokens: number;
  contextMessages: number;
  contextChars: number;
  model: string;
}

const SYSTEM_PROMPT = `You are NEXORA, a helpful and safe workspace assistant. Reply in the user's language unless asked otherwise. Be honest about limitations: never claim an action was completed or that a tool or workspace record was accessed when it was not. Do not invent tool access. Give every user respectful, useful help. Keep answers concise when capacity is constrained and more complete when capacity permits.`;

function envInt(name: string, fallback: number, minimum = 1): number {
  const parsed = Number.parseInt(Deno.env.get(name) ?? "", 10);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}

function policyFor(plan: Plan): PlanPolicy {
  if (plan === "premium") {
    return {
      dailyMessages: envInt("PREMIUM_DAILY_MESSAGE_LIMIT", 100),
      maxInputChars: envInt("PREMIUM_MAX_INPUT_CHARS", 12000),
      maxOutputTokens: envInt("PREMIUM_MAX_OUTPUT_TOKENS", 1600),
      contextMessages: envInt("PREMIUM_CONTEXT_MESSAGES", 30),
      contextChars: envInt("PREMIUM_CONTEXT_CHARS", 40000),
      model: Deno.env.get("OPENAI_PREMIUM_MODEL") || "gpt-4.1",
    };
  }
  return {
    dailyMessages: envInt("FREE_DAILY_MESSAGE_LIMIT", 10),
    maxInputChars: envInt("FREE_MAX_INPUT_CHARS", 2000),
    maxOutputTokens: envInt("FREE_MAX_OUTPUT_TOKENS", 400),
    contextMessages: envInt("FREE_CONTEXT_MESSAGES", 8),
    contextChars: envInt("FREE_CONTEXT_CHARS", 8000),
    model: Deno.env.get("OPENAI_FREE_MODEL") || "gpt-4.1-mini",
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function failure(code: ErrorCode, message: string, status: number, requestId: string): Response {
  return json({ ok: false, error: { code, message, requestId } }, status);
}

function log(event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, ...data }));
}

async function resolvePlan(supabase: DbClient, userId: string): Promise<Plan> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("subscription_lookup_failed");
  return data?.status === "active" || data?.status === "trialing" ? "premium" : "free";
}

async function ownedConversation(supabase: DbClient, userId: string, conversationId: string) {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, title")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("conversation_lookup_failed");
  return data;
}

async function loadLatestHistory(supabase: DbClient, userId: string) {
  const { data: conversation, error } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("history_lookup_failed");
  if (!conversation) return { conversationId: null, messages: [] };

  const { data: messages, error: messagesError } = await supabase
    .from("ai_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversation.id)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });
  if (messagesError) throw new Error("history_messages_failed");
  return { conversationId: conversation.id, messages: messages ?? [] };
}

async function dailyUsage(supabase: DbClient, userId: string): Promise<number> {
  const { data: conversations, error } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("user_id", userId);
  if (error) throw new Error("usage_conversations_failed");
  const ids = (conversations ?? []).map((row) => row.id);
  if (!ids.length) return 0;
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await supabase
    .from("ai_messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", ids)
    .eq("role", "user")
    .gte("created_at", todayUtc.toISOString());
  if (countError) throw new Error("usage_messages_failed");
  return count ?? 0;
}

function trimContext(
  rows: Array<{ role: string | null; content: string | null }>,
  policy: PlanPolicy,
) {
  const selected: Array<{ role: "user" | "assistant"; content: string }> = [];
  let chars = 0;
  for (const row of rows.slice(-policy.contextMessages).reverse()) {
    if ((row.role !== "user" && row.role !== "assistant") || !row.content) continue;
    const remaining = policy.contextChars - chars;
    if (remaining <= 0) break;
    const content = row.content.slice(-remaining);
    selected.push({ role: row.role, content });
    chars += content.length;
  }
  return selected.reverse();
}

async function callOpenAI(apiKey: string, model: string, messages: unknown[], maxTokens: number) {
  const controller = new AbortController();
  const timeoutMs = envInt("OPENAI_TIMEOUT_MS", 30000, 1000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
    });
    if (response.status === 429) throw new Error("provider_rate_limited");
    if (!response.ok)
      throw new Error(response.status >= 500 ? "provider_unavailable" : "provider_error");
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("provider_error");
    return { content, tokens: Number(payload?.usage?.completion_tokens) || null };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("provider_unavailable");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST")
    return failure("invalid_request", "Method not allowed.", 405, requestId);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return failure("unauthorized", "Sign in to use the assistant.", 401, requestId);
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return failure("configuration_error", "The assistant is not configured.", 500, requestId);
  }
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return failure("unauthorized", "Your session is invalid.", 401, requestId);

  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") {
    return failure("invalid_request", "A valid action is required.", 400, requestId);
  }

  try {
    if (body.action === "history") {
      const history = await loadLatestHistory(supabase, user.id);
      return json({ ok: true, data: history });
    }
    if (
      body.action !== "send" ||
      typeof body.message !== "string" ||
      typeof body.requestId !== "string"
    ) {
      return failure("invalid_request", "A message and request ID are required.", 400, requestId);
    }
    const message = body.message.trim();
    if (!message) return failure("invalid_request", "Message cannot be empty.", 400, requestId);

    const plan = await resolvePlan(supabase, user.id);
    const policy = policyFor(plan);
    if (message.length > policy.maxInputChars) {
      return failure(
        "input_too_large",
        "This message is too large for your current access level.",
        413,
        requestId,
      );
    }
    if ((await dailyUsage(supabase, user.id)) >= policy.dailyMessages) {
      const code = plan === "premium" ? "premium_limit_reached" : "free_limit_reached";
      return failure(
        code,
        "Your daily assistant limit has been reached. Please try again tomorrow.",
        429,
        requestId,
      );
    }
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey)
      return failure(
        "configuration_error",
        "The assistant provider is not configured.",
        503,
        requestId,
      );

    let conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
    if (conversationId && !(await ownedConversation(supabase, user.id, conversationId))) {
      return failure("invalid_request", "Conversation was not found.", 404, requestId);
    }
    if (!conversationId) {
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({ user_id: user.id, title: message.slice(0, 80) })
        .select("id")
        .single();
      if (error || !data) throw new Error("persistence_error");
      conversationId = data.id;
    }

    const { data: duplicate, error: duplicateError } = await supabase
      .from("ai_messages")
      .select("id")
      .eq("id", body.requestId)
      .eq("conversation_id", conversationId)
      .maybeSingle();
    if (duplicateError) throw new Error("persistence_error");
    if (duplicate) {
      return failure("invalid_request", "This message was already submitted.", 409, requestId);
    }

    const { error: userMessageError } = await supabase.from("ai_messages").insert({
      id: body.requestId,
      conversation_id: conversationId,
      role: "user",
      content: message,
    });
    if (userMessageError) throw new Error("persistence_error");

    const { data: historyRows, error: historyError } = await supabase
      .from("ai_messages")
      .select("role, content, created_at")
      .eq("conversation_id", conversationId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: true });
    if (historyError) throw new Error("persistence_error");

    const context = trimContext(historyRows ?? [], policy);
    const result = await callOpenAI(
      apiKey,
      policy.model,
      [{ role: "system", content: SYSTEM_PROMPT }, ...context],
      policy.maxOutputTokens,
    );
    const { data: assistantMessage, error: assistantError } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: result.content,
        tokens: result.tokens,
      })
      .select("id, role, content, created_at")
      .single();
    if (assistantError || !assistantMessage) throw new Error("persistence_error");
    const { error: updateError } = await supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("user_id", user.id);
    if (updateError) log("conversation_timestamp_failed", { requestId, userId: user.id });

    return json({
      ok: true,
      data: {
        conversationId,
        userMessage: { id: body.requestId, role: "user", content: message },
        assistantMessage,
        capabilities: {
          basicChat: true,
          advancedChat: plan === "premium",
          agents: plan === "premium",
          translations: plan === "premium",
          contentGeneration: plan === "premium",
          documentAnalysis: plan === "premium",
          studyAssistance: plan === "premium",
          financialInsights: plan === "premium",
        },
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "provider_error";
    log("ai_chat_failure", { requestId, userId: user.id, code });
    if (code === "provider_rate_limited")
      return failure(code, "The AI provider is busy. Please try again later.", 429, requestId);
    if (code === "provider_unavailable")
      return failure(code, "The AI provider is temporarily unavailable.", 503, requestId);
    if (code === "persistence_error" || code.endsWith("_failed")) {
      return failure("persistence_error", "The conversation could not be saved.", 500, requestId);
    }
    return failure(
      "provider_error",
      "The assistant could not complete this request.",
      502,
      requestId,
    );
  }
});
