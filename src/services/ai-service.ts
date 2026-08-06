import { demoAssistantReply } from "@/lib/demo/demo-data";
import { DEMO_MODE, canCallBackend } from "@/lib/demo/config";
import { supabase } from "@/lib/supabase";
import { getRequiredUserId } from "./supabase-service";

export type AiErrorCode =
  | "unauthorized"
  | "premium_required"
  | "invalid_request"
  | "free_limit_reached"
  | "premium_limit_reached"
  | "action_limit_reached"
  | "input_too_large"
  | "resource_not_found"
  | "duplicate_request"
  | "provider_unavailable"
  | "provider_rate_limited"
  | "provider_error"
  | "persistence_error"
  | "configuration_error"
  | "timeout";

export type AiCapability =
  | "basicChat"
  | "advancedChat"
  | "agents"
  | "translations"
  | "contentGeneration"
  | "documentAnalysis"
  | "studyAssistance"
  | "financialInsights";

export type AiAction =
  "translation" | "agent_run" | "content_generation" | "study_assistance" | "document_analysis";

export interface AiActionResult {
  content: string;
  resourceId?: string;
  runId?: string;
  requestId: string;
}

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string | null;
}

interface EdgeSuccess<T> {
  ok: true;
  data: T;
}
interface EdgeFailure {
  ok: false;
  error: { code: AiErrorCode; message: string; requestId?: string };
}

export class AIServiceError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}

async function errorFromInvoke(error: unknown): Promise<AIServiceError> {
  const context = (error as { context?: Response } | null)?.context;
  if (context && typeof context.json === "function") {
    const payload = (await context.json().catch(() => null)) as EdgeFailure | null;
    if (payload?.error?.code) {
      return new AIServiceError(payload.error.code, payload.error.message, payload.error.requestId);
    }
  }
  return new AIServiceError("provider_unavailable", "The assistant is temporarily unavailable.");
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  if (!canCallBackend) {
    throw new AIServiceError("configuration_error", "Supabase is not configured.");
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 35_000);
  try {
    const { data, error } = await supabase.functions.invoke<EdgeSuccess<T> | EdgeFailure>(
      "ai-chat",
      {
        body,
        signal: controller.signal,
      },
    );
    if (error) throw await errorFromInvoke(error);
    if (!data?.ok) {
      const failure = data as EdgeFailure | null;
      throw new AIServiceError(
        failure?.error.code ?? "provider_error",
        failure?.error.message ?? "The assistant could not complete this request.",
        failure?.error.requestId,
      );
    }
    return data.data;
  } catch (error) {
    if (error instanceof AIServiceError) throw error;
    if (controller.signal.aborted) {
      throw new AIServiceError(
        "timeout",
        "The assistant took too long to respond. Please try again.",
      );
    }
    throw new AIServiceError("provider_unavailable", "The assistant is temporarily unavailable.");
  } finally {
    window.clearTimeout(timer);
  }
}

export interface AiSendResult {
  conversationId: string | null;
  userMessage: AiChatMessage;
  assistantMessage: AiChatMessage;
  capabilities: Record<AiCapability, boolean>;
}

export type AiConversation = { id: string; title: string; createdAt: string; updatedAt: string };

export const AIService = {
  async listConversations(): Promise<AiConversation[]> {
    if (DEMO_MODE) return [];
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title ?? "Untitled conversation",
      createdAt: row.created_at ?? "",
      updatedAt: row.updated_at ?? row.created_at ?? "",
    }));
  },

  async loadHistory(
    conversationId?: string | null,
  ): Promise<{ conversationId: string | null; messages: AiChatMessage[] }> {
    if (DEMO_MODE) return { conversationId: null, messages: [] };
    if (conversationId) {
      const userId = await getRequiredUserId();
      const { data: conversation, error: conversationError } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .maybeSingle();
      if (conversationError) throw conversationError;
      if (!conversation)
        throw new AIServiceError("resource_not_found", "Conversation was not found.");
      const { data, error } = await supabase
        .from("ai_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversationId)
        .in("role", ["user", "assistant"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return {
        conversationId,
        messages: (data ?? [])
          .filter(
            (row): row is typeof row & { role: "user" | "assistant" } =>
              row.role === "user" || row.role === "assistant",
          )
          .map((row) => ({
            id: row.id,
            role: row.role,
            content: row.content ?? "",
            created_at: row.created_at,
          })),
      };
    }
    return invoke({ action: "history" });
  },

  async renameConversation(id: string, title: string): Promise<void> {
    const userId = await getRequiredUserId();
    const normalized = title.trim().slice(0, 80);
    if (!normalized)
      throw new AIServiceError("invalid_request", "Conversation title cannot be empty.");
    const { error } = await supabase
      .from("ai_conversations")
      .update({ title: normalized, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },

  async deleteConversation(id: string): Promise<void> {
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },

  async sendChat(input: {
    message: string;
    conversationId: string | null;
    requestId: string;
  }): Promise<AiSendResult> {
    if (DEMO_MODE) {
      return {
        conversationId: input.conversationId,
        userMessage: { id: input.requestId, role: "user", content: input.message },
        assistantMessage: {
          id: crypto.randomUUID(),
          role: "assistant",
          content: demoAssistantReply(input.message),
        },
        capabilities: {
          basicChat: true,
          advancedChat: false,
          agents: false,
          translations: false,
          contentGeneration: false,
          documentAnalysis: false,
          studyAssistance: false,
          financialInsights: false,
        },
      };
    }
    return invoke({ action: "send", ...input });
  },

  async execute(action: AiAction, input: Record<string, unknown>): Promise<AiActionResult> {
    if (DEMO_MODE) {
      throw new AIServiceError(
        "configuration_error",
        "Real AI actions are unavailable in demo mode.",
      );
    }
    return invoke({ action, requestId: crypto.randomUUID(), ...input });
  },
};
