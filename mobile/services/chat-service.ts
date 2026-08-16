import { supabase } from "@/lib/supabase";

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
  const content = message.trim();
  if (!content) throw new ChatServiceError("invalid_request", "Write a message first.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);
  try {
    const { data, error } = await supabase.functions.invoke<EdgeResult>("ai-chat", {
      body: {
        action: "send",
        message: content,
        conversationId: validId(conversationId),
        requestId,
      },
      signal: controller.signal,
    });
    if (error) throw await invocationError(error);
    if (!data?.ok)
      throw new ChatServiceError(
        data?.error.code ?? "provider_error",
        data?.error.message ?? "NEXORA could not respond.",
        data?.error.requestId,
      );
    if (!data.data.conversationId || !data.data.userMessage || !data.data.assistantMessage)
      throw new ChatServiceError("invalid_response", "NEXORA returned an invalid response.");
    return {
      conversationId: data.data.conversationId,
      userMessage: mapMessage(data.data.userMessage),
      assistantMessage: mapMessage(data.data.assistantMessage),
    };
  } catch (error) {
    if (error instanceof ChatServiceError) throw error;
    if (controller.signal.aborted)
      throw new ChatServiceError("timeout", "NEXORA took too long. Try again.");
    throw new ChatServiceError("unavailable", "NEXORA is temporarily unavailable.");
  } finally {
    clearTimeout(timeout);
  }
}
