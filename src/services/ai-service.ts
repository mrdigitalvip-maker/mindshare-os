import { demoAssistantReply } from "@/lib/demo/demo-data";
import { DEMO_MODE, canCallBackend } from "@/lib/demo/config";
import { supabase } from "@/lib/supabase";

export type AiErrorCode =
  | "unauthorized"
  | "invalid_request"
  | "free_limit_reached"
  | "premium_limit_reached"
  | "input_too_large"
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

export const AIService = {
  async loadHistory(): Promise<{ conversationId: string | null; messages: AiChatMessage[] }> {
    if (DEMO_MODE) return { conversationId: null, messages: [] };
    return invoke({ action: "history" });
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
};
