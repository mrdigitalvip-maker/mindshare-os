import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, preflightResponse, rejectDisallowedOrigin } from "../_shared/http.ts";
import { parseNexoraModelResponse } from "../_shared/nexora-actions.js";
import { NEXORA_RESPONSE_SCHEMA } from "../_shared/nexora-response-schema.js";
import {
  boundWorkspaceContext,
  buildMultimodalUserContent,
  validateAttachmentMetadata,
  type SafeAttachment,
} from "../_shared/assistant-context.ts";
import {
  assistantRequestFingerprint,
  parseAssistantQuotaClaim,
} from "../_shared/assistant-quota.ts";
import { resolveCanonicalDisplayName } from "../_shared/user-identity.ts";
import {
  buildNexoraAgentSystemPrompt,
  buildNexoraAssistantSystemPrompt,
} from "../_shared/nexora-identity.ts";

type ErrorCode =
  | "unauthorized"
  | "premium_required"
  | "invalid_request"
  | "free_limit_reached"
  | "premium_limit_reached"
  | "attachment_limit_reached"
  | "action_limit_reached"
  | "input_too_large"
  | "resource_not_found"
  | "duplicate_request"
  | "provider_unavailable"
  | "provider_rate_limited"
  | "provider_error"
  | "persistence_error"
  | "configuration_error"
  | "timeout"
  | "attachment_type"
  | "attachment_size"
  | "attachment_ownership";
type Plan = "free" | "premium";
type DbClient = ReturnType<typeof createClient>;

interface PlanPolicy {
  maxInputChars: number;
  maxOutputTokens: number;
  contextMessages: number;
  contextChars: number;
  model: string;
}

function envInt(name: string, fallback: number, minimum = 1): number {
  const parsed = Number.parseInt(Deno.env.get(name) ?? "", 10);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}

function policyFor(plan: Plan): PlanPolicy {
  if (plan === "premium") {
    return {
      maxInputChars: envInt("PREMIUM_MAX_INPUT_CHARS", 12000),
      maxOutputTokens: envInt("PREMIUM_MAX_OUTPUT_TOKENS", 1600),
      contextMessages: envInt("PREMIUM_CONTEXT_MESSAGES", 30),
      contextChars: envInt("PREMIUM_CONTEXT_CHARS", 40000),
      model: Deno.env.get("OPENAI_PREMIUM_MODEL") || "gpt-4.1",
    };
  }
  return {
    maxInputChars: envInt("FREE_MAX_INPUT_CHARS", 2000),
    maxOutputTokens: envInt("FREE_MAX_OUTPUT_TOKENS", 400),
    contextMessages: envInt("FREE_CONTEXT_MESSAGES", 8),
    contextChars: envInt("FREE_CONTEXT_CHARS", 8000),
    model: Deno.env.get("OPENAI_FREE_MODEL") || "gpt-4.1-mini",
  };
}

function log(event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, ...data }));
}

type OpenAIErrorMetadata = {
  type?: string;
  code?: string;
  param?: string;
  message?: string;
};

function safeProviderErrorField(value: unknown, maxLength = 200): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

function parseOpenAIError(payload: unknown): OpenAIErrorMetadata {
  if (!payload || typeof payload !== "object") return {};
  const error = (payload as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return {};
  const fields = error as Record<string, unknown>;
  return {
    type: safeProviderErrorField(fields.type),
    code: safeProviderErrorField(fields.code),
    param: safeProviderErrorField(fields.param),
    message: safeProviderErrorField(fields.message, 300),
  };
}

function classifyOpenAIStatus(
  status: number,
): "provider_rate_limited" | "provider_unavailable" | "provider_error" {
  if (status === 429) return "provider_rate_limited";
  if (status >= 500) return "provider_unavailable";
  return "provider_error";
}

async function resolvePlan(supabase: DbClient, userId: string): Promise<Plan> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, entitlement, current_period_end")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("subscription_lookup_failed");
  const authorized =
    data?.entitlement === "premium" &&
    ["active", "trialing", "canceled", "grace_period"].includes(data?.status ?? "");
  const expired = data?.current_period_end
    ? new Date(data.current_period_end).getTime() <= Date.now()
    : false;
  return authorized && !expired ? "premium" : "free";
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
    .select("id, role, content, created_at, attachments")
    .eq("conversation_id", conversation.id)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });
  if (messagesError) throw new Error("history_messages_failed");
  return { conversationId: conversation.id, messages: messages ?? [] };
}

async function loadConversationHistory(supabase: DbClient, userId: string, conversationId: string) {
  const conversation = await ownedConversation(supabase, userId, conversationId);
  if (!conversation) throw new Error("conversation_not_found");
  const { data: messages, error } = await supabase
    .from("ai_messages")
    .select("id, role, content, created_at, attachments")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });
  if (error) throw new Error("history_messages_failed");
  return { conversationId, messages: messages ?? [] };
}

function conversationTitle(message: string, maxLength = 56) {
  const cleaned = message
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Conversa com a NEXORA";
  const plain = cleaned.replace(/[\"'“”]/g, "").replace(/[.!?,;:]+$/, "");
  if (plain.length <= maxLength) return plain;
  const clipped = plain.slice(0, maxLength + 1);
  const boundary = clipped.lastIndexOf(" ");
  return clipped.slice(0, boundary >= maxLength * 0.6 ? boundary : maxLength).trim();
}

async function loadWorkspaceContext(
  supabase: DbClient,
  userId: string,
  authMetadata?: Record<string, unknown>,
) {
  const [profile, tasks, projects, studies] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase
      .from("tasks")
      .select(
        "id,title,due_date,completed,project_id,updated_at,execution_status,next_action,blocker_note",
      )
      .eq("user_id", userId)
      .order("due_date", { ascending: true })
      .limit(30),
    supabase
      .from("projects")
      .select("id,title,status,due_date,updated_at,objective")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(15),
    supabase
      .from("study_subjects")
      .select("id,name,status,updated_at,next_action,objective")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(15),
  ]);
  if (profile.error || tasks.error || projects.error || studies.error)
    throw new Error("workspace_context_failed");
  const projectNames = new Map((projects.data ?? []).map((project) => [project.id, project.title]));
  return boundWorkspaceContext({
    profile: resolveCanonicalDisplayName(profile.data?.full_name, authMetadata),
    tasks: (tasks.data ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      dueDate: task.due_date,
      completed: task.completed,
      project: task.project_id ? (projectNames.get(task.project_id) ?? null) : null,
      projectId: task.project_id,
      updatedAt: task.updated_at,
      executionStatus: task.execution_status,
      nextAction: task.next_action,
      blocker: task.blocker_note,
    })),
    projects: projects.data ?? [],
    studies: studies.data ?? [],
  });
}

async function loadOwnedAttachment(supabase: DbClient, attachment: SafeAttachment) {
  const { data, error } = await supabase.storage
    .from("ai-attachments")
    .download(attachment.storagePath);
  if (error || !data) throw new Error("attachment_ownership");
  if (data.size !== attachment.size) throw new Error("attachment_size");
  if (data.type.toLowerCase() !== attachment.mimeType) throw new Error("attachment_type");
  if (attachment.mimeType === "text/plain")
    return { mimeType: attachment.mimeType, text: (await data.text()).slice(0, 30000) };
  const bytes = new Uint8Array(await data.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return {
    mimeType: attachment.mimeType,
    dataUrl: `data:${attachment.mimeType};base64,${btoa(binary)}`,
  };
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

async function callOpenAI(
  apiKey: string,
  model: string,
  messages: unknown[],
  maxTokens: number,
  responseFormat?: Record<string, unknown>,
) {
  const controller = new AbortController();
  const timeoutMs = envInt("OPENAI_TIMEOUT_MS", 30000, 1000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        ...(responseFormat ? { response_format: responseFormat } : {}),
      }),
    });
    if (!response.ok) {
      const providerError = await response
        .json()
        .then(parseOpenAIError)
        .catch(() => ({}));
      const providerRequestId = safeProviderErrorField(
        response.headers.get("x-request-id") ??
          response.headers.get("openai-request-id") ??
          response.headers.get("request-id"),
      );
      log("ai_provider_error", {
        provider: "openai",
        model,
        status: response.status,
        error: providerError,
        ...(providerRequestId ? { requestId: providerRequestId } : {}),
      });
      throw new Error(classifyOpenAIStatus(response.status));
    }
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("provider_error");
    return {
      content,
      tokens: Number(payload?.usage?.completion_tokens) || null,
      inputTokens: Number(payload?.usage?.prompt_tokens) || null,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("timeout");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

type TypedAction =
  "translation" | "agent_run" | "content_generation" | "study_assistance" | "document_analysis";

const recentRequests = new Map<string, number>();
const transientUsage = new Map<string, { day: string; count: number }>();

const ACTION_LIMITS: Record<TypedAction, Record<Plan, number>> = {
  translation: { free: 5, premium: 100 },
  agent_run: { free: 0, premium: 30 },
  content_generation: { free: 2, premium: 50 },
  study_assistance: { free: 5, premium: 50 },
  document_analysis: { free: 0, premium: 20 },
};

function actionInputLimit(action: TypedAction, plan: Plan) {
  const premium = plan === "premium";
  if (action === "translation") return premium ? 12000 : 1500;
  if (action === "document_analysis") return premium ? 30000 : 0;
  return premium ? 16000 : 2000;
}

function claimTransientUsage(userId: string, action: TypedAction, plan: Plan, requestKey: string) {
  const now = Date.now();
  for (const [key, timestamp] of recentRequests) {
    if (now - timestamp > 86_400_000) recentRequests.delete(key);
  }
  if (recentRequests.has(requestKey)) throw new Error("duplicate_request");
  const day = new Date().toISOString().slice(0, 10);
  const key = `${userId}:${action}`;
  const current = transientUsage.get(key);
  const count = current?.day === day ? current.count : 0;
  if (count >= ACTION_LIMITS[action][plan]) throw new Error("action_limit_reached");
  recentRequests.set(requestKey, now);
  transientUsage.set(key, { day, count: count + 1 });
}

async function persistentUsage(
  supabase: DbClient,
  userId: string,
  action: TypedAction,
): Promise<number> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (action === "translation") {
    const { count, error } = await supabase
      .from("translations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", today.toISOString());
    if (error) throw new Error("persistence_error");
    return count ?? 0;
  }
  if (action === "content_generation") {
    const { count, error } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "draft")
      .gte("created_at", today.toISOString());
    if (error) throw new Error("persistence_error");
    return count ?? 0;
  }
  if (action === "agent_run") {
    const { data: agents, error } = await supabase
      .from("agents")
      .select("id")
      .eq("user_id", userId);
    if (error) throw new Error("persistence_error");
    const ids = (agents ?? []).map((agent) => agent.id);
    if (!ids.length) return 0;
    const { count, error: countError } = await supabase
      .from("agent_runs")
      .select("id", { count: "exact", head: true })
      .in("agent_id", ids)
      .gte("started_at", today.toISOString());
    if (countError) throw new Error("persistence_error");
    return count ?? 0;
  }
  return 0;
}

async function executeTypedAction(
  action: TypedAction,
  body: Record<string, unknown>,
  supabase: DbClient,
  userId: string,
  plan: Plan,
  requestId: string,
) {
  if ((action === "agent_run" || action === "document_analysis") && plan !== "premium") {
    throw new Error("premium_required");
  }
  const clientRequestId = typeof body.requestId === "string" ? body.requestId : "";
  if (!clientRequestId) throw new Error("invalid_request");
  if ((await persistentUsage(supabase, userId, action)) >= ACTION_LIMITS[action][plan]) {
    throw new Error("action_limit_reached");
  }
  claimTransientUsage(userId, action, plan, `${userId}:${action}:${clientRequestId}`);
  const policy = policyFor(plan);
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("configuration_error");

  let input = "";
  let system = "";
  let runId: string | undefined;
  let persist: (() => Promise<string | undefined>) | undefined;

  if (action === "translation") {
    input = typeof body.text === "string" ? body.text.trim() : "";
    const source = typeof body.sourceLanguage === "string" ? body.sourceLanguage : "auto";
    const target = typeof body.targetLanguage === "string" ? body.targetLanguage : "";
    if (!input || !target || source === target) throw new Error("invalid_request");
    system = `Translate faithfully from ${source} to ${target}. Return only the translation, preserving meaning and formatting.`;
    persist = async () => {
      const result = await callOpenAI(
        apiKey,
        policy.model,
        [
          { role: "system", content: system },
          { role: "user", content: input },
        ],
        policy.maxOutputTokens,
      );
      const { data, error } = await supabase
        .from("translations")
        .insert({
          user_id: userId,
          original_text: input,
          translated_text: result.content,
          source_language: source,
          target_language: target,
          provider: "openai",
        })
        .select("id")
        .single();
      if (error || !data) throw new Error("persistence_error");
      return JSON.stringify({ content: result.content, resourceId: data.id });
    };
  } else if (action === "agent_run") {
    input = typeof body.input === "string" ? body.input.trim() : "";
    const agentId = typeof body.agentId === "string" ? body.agentId : "";
    if (!agentId || !input) throw new Error("invalid_request");
    const { data: agent, error } = await supabase
      .from("agents")
      .select("id, system_prompt, temperature, active")
      .eq("id", agentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error("persistence_error");
    if (!agent) throw new Error("resource_not_found");
    const { data: duplicate } = await supabase
      .from("agent_runs")
      .select("id")
      .eq("agent_id", agentId)
      .eq("input", input)
      .in("status", ["queued", "running"])
      .maybeSingle();
    if (duplicate) throw new Error("duplicate_request");
    const { data: run, error: runError } = await supabase
      .from("agent_runs")
      .insert({ agent_id: agentId, input, status: "running", started_at: new Date().toISOString() })
      .select("id")
      .single();
    if (runError || !run) throw new Error("persistence_error");
    runId = run.id;
    system = buildNexoraAgentSystemPrompt(
      agent.system_prompt?.trim() || "Complete the user's task safely and accurately.",
    );
  } else if (action === "document_analysis") {
    const documentId = typeof body.documentId === "string" ? body.documentId : "";
    const instruction =
      typeof body.instruction === "string" ? body.instruction.trim() : "Summarize this document.";
    const { data: document, error } = await supabase
      .from("documents")
      .select("content")
      .eq("id", documentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error("persistence_error");
    if (!document) throw new Error("resource_not_found");
    if (!document.content?.trim()) throw new Error("invalid_request");
    input = `${instruction}\n\nDOCUMENT:\n${document.content}`;
    system =
      "Analyze only the supplied document text. Do not claim access to a physical file or external source.";
  } else {
    input = typeof body.text === "string" ? body.text.trim() : "";
    const operation = typeof body.operation === "string" ? body.operation : "";
    if (!input || !operation) throw new Error("invalid_request");
    if (action === "content_generation") {
      const allowed = ["draft", "rewrite", "summarize", "expand", "tone", "title"];
      if (!allowed.includes(operation)) throw new Error("invalid_request");
      system = `Perform the content operation '${operation}'. Return only the requested result. Never claim it was published.`;
    } else {
      const allowed = ["explain", "summarize", "questions", "flashcards", "study_plan"];
      if (!allowed.includes(operation)) throw new Error("invalid_request");
      system = `Provide study assistance using operation '${operation}'. Do not invent saved subjects or sessions.`;
    }
  }

  if (input.length > actionInputLimit(action, plan)) throw new Error("input_too_large");
  if (persist) {
    const encoded = await persist();
    return { ...JSON.parse(encoded!), requestId };
  }
  try {
    const result = await callOpenAI(
      apiKey,
      policy.model,
      [
        { role: "system", content: system },
        { role: "user", content: input },
      ],
      policy.maxOutputTokens,
    );
    if (runId) {
      const { error } = await supabase
        .from("agent_runs")
        .update({
          status: "completed",
          output: result.content,
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
      if (error) throw new Error("persistence_error");
    }
    if (action === "content_generation") {
      const title =
        typeof body.title === "string" && body.title.trim() ? body.title.trim() : "AI draft";
      const { data, error } = await supabase
        .from("documents")
        .insert({ user_id: userId, title, type: "draft", content: result.content })
        .select("id")
        .single();
      if (error || !data) throw new Error("persistence_error");
      return { content: result.content, resourceId: data.id, requestId };
    }
    return { content: result.content, runId, requestId };
  } catch (error) {
    if (runId)
      await supabase
        .from("agent_runs")
        .update({ status: "failed", finished_at: new Date().toISOString() })
        .eq("id", runId);
    throw error;
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const json = (body: unknown, status = 200) => jsonResponse(req, body, status);
  const failure = (code: ErrorCode, message: string, status: number, id: string) =>
    json({ ok: false, error: { code, message, requestId: id } }, status);
  if (req.method === "OPTIONS") return preflightResponse(req);
  const rejectedOrigin = rejectDisallowedOrigin(req);
  if (rejectedOrigin) return rejectedOrigin;
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
      const history =
        typeof body.conversationId === "string"
          ? await loadConversationHistory(supabase, user.id, body.conversationId)
          : await loadLatestHistory(supabase, user.id);
      return json({ ok: true, data: history });
    }
    if (
      [
        "translation",
        "agent_run",
        "content_generation",
        "study_assistance",
        "document_analysis",
      ].includes(body.action)
    ) {
      const plan = await resolvePlan(supabase, user.id);
      const usageRequestId = typeof body.requestId === "string" ? body.requestId : requestId;
      const { error: usageError } = await supabase.from("ai_usage").insert({
        user_id: user.id,
        action: body.action,
        request_id: usageRequestId,
      });
      if (usageError)
        return failure("duplicate_request", "This request was already submitted.", 409, requestId);
      const data = await executeTypedAction(
        body.action as TypedAction,
        body,
        supabase,
        user.id,
        plan,
        requestId,
      );
      await supabase
        .from("ai_usage")
        .update({ output_units: null })
        .eq("user_id", user.id)
        .eq("request_id", usageRequestId);
      return json({ ok: true, data });
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
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)
    )
      return failure("invalid_request", "Request ID must be a UUID.", 400, requestId);

    const attachments = validateAttachmentMetadata(body.attachments, user.id);
    const requestedConversationId =
      typeof body.conversationId === "string" ? body.conversationId : null;
    const requestFingerprint = await assistantRequestFingerprint({
      message,
      conversationId: requestedConversationId,
      attachments,
    });
    const loadedAttachment = attachments[0]
      ? await loadOwnedAttachment(supabase, attachments[0])
      : undefined;
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
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey)
      return failure(
        "configuration_error",
        "The assistant provider is not configured.",
        503,
        requestId,
      );

    let conversationId = requestedConversationId;
    // Resolve retries by their globally unique message ID first. The first attempt may
    // have created a conversation before a provider/network failure reached the client.
    const { data: priorRequest, error: priorRequestError } = await supabase
      .from("ai_messages")
      .select("id, conversation_id, role, content, created_at, attachments")
      .eq("id", body.requestId)
      .maybeSingle();
    if (priorRequestError) throw new Error("persistence_error");
    if (priorRequest) {
      if (priorRequest.content !== message)
        return failure(
          "invalid_request",
          "This request ID belongs to another message.",
          409,
          requestId,
        );
      if (conversationId && conversationId !== priorRequest.conversation_id)
        return failure(
          "invalid_request",
          "This request belongs to another conversation.",
          409,
          requestId,
        );
      conversationId = priorRequest.conversation_id;
    }
    if (conversationId && !(await ownedConversation(supabase, user.id, conversationId))) {
      return failure("invalid_request", "Conversation was not found.", 404, requestId);
    }
    const { data: rawQuotaClaim, error: quotaClaimError } = await supabase.rpc(
      "claim_assistant_usage",
      {
        p_request_id: body.requestId,
        p_request_fingerprint: requestFingerprint,
        p_has_attachment: attachments.length > 0,
      },
    );
    if (quotaClaimError) {
      if (quotaClaimError.code === "P0001")
        return failure(
          "invalid_request",
          "This request ID belongs to another request.",
          409,
          requestId,
        );
      throw new Error("quota_claim_failed");
    }
    const quotaClaim = parseAssistantQuotaClaim(rawQuotaClaim);
    if (!quotaClaim) throw new Error("quota_claim_failed");
    if (!quotaClaim.allowed) {
      if (quotaClaim.deniedFeature === "assistant_attachment")
        return failure(
          "attachment_limit_reached",
          "Your daily attachment analysis limit has been reached.",
          429,
          requestId,
        );
      const code =
        quotaClaim.entitlement === "premium" ? "premium_limit_reached" : "free_limit_reached";
      return failure(
        code,
        "Your daily assistant limit has been reached. Please try again tomorrow.",
        429,
        requestId,
      );
    }
    if (!conversationId) {
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({ user_id: user.id, title: conversationTitle(message) })
        .select("id")
        .single();
      if (error || !data) throw new Error("persistence_error");
      conversationId = data.id;
    }

    const duplicate = priorRequest;
    if (duplicate) {
      const { data: completedReply, error: completedReplyError } = await supabase
        .from("ai_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversationId)
        .eq("role", "assistant")
        .gte("created_at", duplicate.created_at)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (completedReplyError) throw new Error("persistence_error");
      if (completedReply) {
        return json({
          ok: true,
          data: { conversationId, userMessage: duplicate, assistantMessage: completedReply },
        });
      }
    } else {
      const { error: userMessageError } = await supabase.from("ai_messages").insert({
        id: body.requestId,
        conversation_id: conversationId,
        role: "user",
        content: message,
        attachments,
      });
      if (userMessageError) throw new Error("persistence_error");
    }

    const { data: historyRows, error: historyError } = await supabase
      .from("ai_messages")
      .select("role, content, created_at")
      .eq("conversation_id", conversationId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: true });
    if (historyError) throw new Error("persistence_error");

    const context = trimContext(historyRows ?? [], policy);
    const workspaceContext = await loadWorkspaceContext(supabase, user.id, user.user_metadata);
    if (context.length && loadedAttachment) {
      context[context.length - 1] = {
        role: "user",
        content: buildMultimodalUserContent(message, loadedAttachment) as never,
      };
    }
    const result = await callOpenAI(
      apiKey,
      policy.model,
      [
        {
          role: "system",
          content: buildNexoraAssistantSystemPrompt({
            currentUtcTime: new Date().toISOString(),
            timezone: typeof body.timezone === "string" ? body.timezone.slice(0, 80) : "UTC",
            workspaceContext,
          }),
        },
        ...context,
      ],
      policy.maxOutputTokens,
      {
        type: "json_schema",
        json_schema: {
          name: "nexora_response",
          strict: true,
          schema: NEXORA_RESPONSE_SCHEMA,
        },
      },
    );
    let parsedModelResponse: ReturnType<typeof parseNexoraModelResponse> = null;
    try {
      parsedModelResponse = parseNexoraModelResponse(JSON.parse(result.content));
    } catch {
      /* untrusted malformed output */
    }
    if (!parsedModelResponse) throw new Error("provider_error");
    const { data: assistantMessage, error: assistantError } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: parsedModelResponse.message,
        tokens: result.tokens,
      })
      .select("id, role, content, created_at")
      .single();
    if (assistantError || !assistantMessage) throw new Error("persistence_error");
    const existingConversation = await ownedConversation(supabase, user.id, conversationId);
    const genericTitle =
      !existingConversation?.title ||
      ["nova conversa", "new chat", "conversation", "conversa"].includes(
        existingConversation.title.trim().toLowerCase(),
      );
    const firstUserContent = historyRows?.find((row) => row.role === "user")?.content ?? message;
    const { error: updateError } = await supabase
      .from("ai_conversations")
      .update({
        updated_at: new Date().toISOString(),
        ...(genericTitle ? { title: conversationTitle(firstUserContent) } : {}),
      })
      .eq("id", conversationId)
      .eq("user_id", user.id);
    if (updateError) log("conversation_timestamp_failed", { requestId, userId: user.id });

    return json({
      ok: true,
      data: {
        conversationId,
        userMessage: { id: body.requestId, role: "user", content: message, attachments },
        assistantMessage,
        ...(parsedModelResponse.action ? { action: parsedModelResponse.action } : {}),
        ...(parsedModelResponse.proposed_actions
          ? { proposedActions: parsedModelResponse.proposed_actions }
          : {}),
        capabilities: {
          basicChat: true,
          advancedChat: plan === "premium",
          agents: plan === "premium",
          translations: true,
          contentGeneration: true,
          documentAnalysis: plan === "premium",
          studyAssistance: true,
          financialInsights: false,
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
    if (code === "timeout") return failure(code, "The AI request timed out.", 504, requestId);
    if (code === "premium_required")
      return failure(code, "This action requires an active Premium subscription.", 403, requestId);
    if (code === "action_limit_reached")
      return failure(code, "The daily limit for this action has been reached.", 429, requestId);
    if (code === "attachment_limit_reached")
      return failure(code, "The daily attachment analysis limit has been reached.", 429, requestId);
    if (code === "duplicate_request")
      return failure(code, "This request was already submitted.", 409, requestId);
    if (code === "resource_not_found")
      return failure(code, "The requested resource was not found.", 404, requestId);
    if (code === "conversation_not_found")
      return failure(code, "The conversation was not found.", 404, requestId);
    if (code === "input_too_large")
      return failure(code, "This input is too large for your access level.", 413, requestId);
    if (code === "invalid_request") return failure(code, "The request is invalid.", 400, requestId);
    if (code === "attachment_type")
      return failure(code, "The attachment type is not supported.", 400, requestId);
    if (code === "attachment_size")
      return failure(code, "The attachment exceeds the size limit.", 413, requestId);
    if (code === "attachment_ownership")
      return failure(code, "The attachment is not available to this user.", 403, requestId);
    if (code === "configuration_error")
      return failure(code, "The AI provider is not configured.", 503, requestId);
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
