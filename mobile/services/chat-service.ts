import { supabase } from "@/lib/supabase";
import {
  buildAssistantSendPayload,
  classifyAssistantError,
  validateAssistantSendData,
  type AssistantErrorCategory,
} from "@/lib/chat-contract";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string | null;
};
export type ChatResult = {
  conversationId: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
};
type EdgeResult =
  | {
      ok: true;
      data: {
        conversationId: string | null;
        userMessage: { id: string; role: "user"; content: string; created_at?: string | null };
        assistantMessage: {
          id: string;
          role: "assistant";
          content: string;
          created_at?: string | null;
        };
      };
    }
  | { ok: false; error: { code?: string; message?: string; requestId?: string } };
type HistoryResult =
  | {
      ok: true;
      data: {
        conversationId: string | null;
        messages: Array<{
          id: string;
          role: "user" | "assistant";
          content: string;
          created_at?: string | null;
        }>;
      };
    }
  | { ok: false; error: { code?: string; message?: string } };

function validId(value: string | null): string | null {
  const id = value?.trim() ?? "";
  return id || null;
}
function mapMessage(value: {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string | null;
}): ChatMessage {
  return {
    id: value.id,
    role: value.role,
    content: value.content,
    createdAt: value.created_at ?? null,
  };
}
export class ChatServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly diagnosticId?: string,
    public readonly category: AssistantErrorCategory = classifyAssistantError(code),
  ) {
    super(message);
    this.name = "ChatServiceError";
  }
}
async function invocationError(error: unknown): Promise<ChatServiceError> {
  const context = (error as { context?: Response } | null)?.context;
  if (context) {
    const payload = (await context.json().catch(() => null)) as {
      error?: { code?: string; message?: string; requestId?: string };
    } | null;
    const statusCodes: Record<number, string> = {
      400: "invalid_request",
      401: "unauthorized",
      403: "forbidden",
      429: "rate_limited",
      500: "server_error",
    };
    return new ChatServiceError(
      payload?.error?.code ?? statusCodes[context.status] ?? "unavailable",
      payload?.error?.message ?? "NEXORA is temporarily unavailable.",
      payload?.error?.requestId,
    );
  }
  return new ChatServiceError("unavailable", "NEXORA is temporarily unavailable.");
}
export async function loadRecentConversation(): Promise<{
  conversationId: string | null;
  messages: ChatMessage[];
}> {
  const { data, error } = await supabase.functions.invoke<HistoryResult>("ai-chat", {
    body: { action: "history" },
  });
  if (error) throw await invocationError(error);
  if (!data?.ok)
    throw new ChatServiceError(
      data?.error.code ?? "history_failed",
      data?.error.message ?? "Conversation history could not be loaded.",
    );
  return {
    conversationId: validId(data.data.conversationId),
    messages: (data.data.messages ?? []).map(mapMessage),
  };
}
export async function loadConversation(conversationId: string): Promise<ChatMessage[]> {
  const id = validId(conversationId);
  if (!id) throw new ChatServiceError("invalid_request", "Conversation ID is required.");
  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", id)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });
  if (error)
    throw new ChatServiceError("history_failed", "Conversation history could not be loaded.");
  return (data ?? [])
    .filter(
      (item): item is typeof item & { role: "user" | "assistant" } =>
        item.role === "user" || item.role === "assistant",
    )
    .map(mapMessage);
}
export async function sendChat(
  message: string,
  conversationId: string | null,
  requestId: string,
): Promise<ChatResult> {
  const payload = buildAssistantSendPayload(message, conversationId, requestId);
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    let session = sessionData.session;
    if (!sessionError && session?.expires_at && session.expires_at * 1000 - Date.now() < 30_000) {
      const refreshed = await supabase.auth.refreshSession();
      session = refreshed.data.session;
    }
    if (sessionError || !session?.access_token)
      throw new ChatServiceError("unauthorized", "An authenticated session is required.");
    const { data, error } = await supabase.functions.invoke<EdgeResult>("ai-chat", {
      body: payload,
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) throw await invocationError(error);
    if (!data?.ok)
      throw new ChatServiceError(
        data?.error.code ?? "provider_error",
        data?.error.message ?? "NEXORA could not respond.",
        data?.error.requestId,
      );
    let normalized: ReturnType<typeof validateAssistantSendData>;
    try {
      normalized = validateAssistantSendData(data.data);
    } catch {
      throw new ChatServiceError("invalid_response", "NEXORA returned an invalid response.");
    }
    return {
      conversationId: normalized.conversationId,
      userMessage: mapMessage(normalized.userMessage),
      assistantMessage: mapMessage(normalized.assistantMessage),
    };
  } catch (error) {
    if (error instanceof ChatServiceError) throw error;
    throw new ChatServiceError("unavailable", "NEXORA is temporarily unavailable.");
  }
}
