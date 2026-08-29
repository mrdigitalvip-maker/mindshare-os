import { supabase } from "@/lib/supabase";
import {
  buildAssistantSendPayload,
  classifyAssistantError,
  validateAssistantSendData,
  parseWireAttachments,
  type AssistantErrorCategory,
} from "@/lib/chat-contract";
import type { ChatAttachment } from "@/lib/chat-attachments";
import type { NexoraAction } from "@/lib/nexora-actions";
import { mapConversationRows, type AssistantConversation } from "@/lib/assistant-conversations";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string | null;
  attachments: ChatAttachment[];
};
export type ChatResult = {
  conversationId: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  proposedActions: NexoraAction[];
};
type EdgeResult =
  | {
      ok: true;
      data: {
        conversationId: string | null;
        userMessage: import("@/lib/chat-contract").AssistantWireMessage;
        assistantMessage: import("@/lib/chat-contract").AssistantWireMessage;
        proposedActions?: unknown;
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
          attachments?: import("@/lib/chat-contract").AssistantWireMessage["attachments"];
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
  attachments?: import("@/lib/chat-contract").AssistantWireMessage["attachments"];
}): ChatMessage {
  return {
    id: value.id,
    role: value.role,
    content: value.content,
    createdAt: value.created_at ?? null,
    attachments: parseWireAttachments(value.attachments),
  };
}
async function hydrateMessage(value: Parameters<typeof mapMessage>[0]): Promise<ChatMessage> {
  const message = mapMessage(value);
  message.attachments = await Promise.all(
    message.attachments.map(async (attachment) => ({
      ...attachment,
      previewUri:
        attachment.kind === "image"
          ? (
              await supabase.storage
                .from("ai-attachments")
                .createSignedUrl(attachment.storagePath, 300)
            ).data?.signedUrl
          : undefined,
    })),
  );
  return message;
}
export class ChatServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly diagnosticId?: string,
    public readonly category: AssistantErrorCategory = classifyAssistantError(code),
    public readonly status?: number,
    public readonly stage: "session" | "invoke" | "response" = "invoke",
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
      classifyAssistantError(payload?.error?.code ?? statusCodes[context.status] ?? "unavailable"),
      context.status,
      "invoke",
    );
  }
  return new ChatServiceError(
    "unavailable",
    "NEXORA is temporarily unavailable.",
    undefined,
    "NETWORK",
    undefined,
    "invoke",
  );
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
    messages: await Promise.all((data.data.messages ?? []).map(hydrateMessage)),
  };
}
export async function listConversations(): Promise<AssistantConversation[]> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(30);
  if (error) throw new ChatServiceError("history_failed", "Conversations could not be loaded.");
  return mapConversationRows(data ?? []);
}
export async function loadConversation(conversationId: string): Promise<ChatMessage[]> {
  const id = validId(conversationId);
  if (!id) throw new ChatServiceError("invalid_request", "Conversation ID is required.");
  const { data, error } = await supabase.functions.invoke<HistoryResult>("ai-chat", {
    body: { action: "history", conversationId: id },
  });
  if (error) throw await invocationError(error);
  if (!data?.ok)
    throw new ChatServiceError(
      data?.error.code ?? "history_failed",
      data?.error.message ?? "Conversation history could not be loaded.",
    );
  return Promise.all(
    (data.data.messages ?? [])
      .filter(
        (item): item is typeof item & { role: "user" | "assistant" } =>
          item.role === "user" || item.role === "assistant",
      )
      .map(hydrateMessage),
  );
}
export async function sendChat(
  message: string,
  conversationId: string | null,
  requestId: string,
  attachments: ChatAttachment[] = [],
): Promise<ChatResult> {
  const payload = buildAssistantSendPayload(
    message,
    conversationId,
    requestId,
    attachments.map(({ previewUri: _previewUri, ...attachment }) => attachment),
  );
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    let session = sessionData.session;
    if (!sessionError && session?.expires_at && session.expires_at * 1000 - Date.now() < 30_000) {
      const refreshed = await supabase.auth.refreshSession();
      session = refreshed.data.session;
    }
    if (sessionError || !session?.access_token)
      throw new ChatServiceError(
        "unauthorized",
        "An authenticated session is required.",
        undefined,
        "AUTH",
        undefined,
        "session",
      );
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
      throw new ChatServiceError(
        "invalid_response",
        "NEXORA returned an invalid response.",
        undefined,
        "VALIDATION",
        undefined,
        "response",
      );
    }
    return {
      conversationId: normalized.conversationId,
      userMessage: mapMessage(normalized.userMessage),
      assistantMessage: mapMessage(normalized.assistantMessage),
      proposedActions: normalized.proposedActions,
    };
  } catch (error) {
    if (error instanceof ChatServiceError) throw error;
    throw new ChatServiceError("unavailable", "NEXORA is temporarily unavailable.");
  }
}
