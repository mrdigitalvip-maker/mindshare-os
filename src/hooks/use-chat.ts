import { useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { sendAiChat, type AiMessage } from "@/lib/ai-service";
import { withDemoFallback } from "@/lib/demo/fallback";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface SendMessageInput {
  content: string;
  history: ChatMessage[];
}

interface SendMessageResult {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  provider: "openai";
}

function localId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

function normalizeChatMessage(message: {
  id: string;
  role: string | null;
  content: string | null;
}): ChatMessage {
  return {
    id: message.id,
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content ?? "",
  };
}

/**
 * Handles a single-conversation Assistant chat: lazily creates the
 * `ai_conversations` row on the first message, persists every user and
 * assistant message to `ai_messages`, and calls the `ai-chat` Edge
 * Function for the model response.
 *
 * Persistence is best-effort: when the backend is unavailable (demo mode or
 * a failing request) the conversation still works in-memory through the
 * temporary fallback layer in `src/lib/demo/*`.
 */
export function useChat() {
  const { user } = useAuth();
  const conversationIdRef = useRef<string | null>(null);

  const loadConversationHistory = useCallback(
    async (): Promise<ChatMessage[]> =>
      withDemoFallback(
        async () => {
          if (!user) return [];

          const { data: latestConversation, error: conversationError } = await supabase
            .from("ai_conversations")
            .select("id")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (conversationError) throw conversationError;
          if (!latestConversation?.id) return [];

          conversationIdRef.current = latestConversation.id;

          const { data: rows, error: historyError } = await supabase
            .from("ai_messages")
            .select("id, role, content")
            .eq("conversation_id", latestConversation.id)
            .order("created_at", { ascending: true });

          if (historyError) throw historyError;

          return (rows ?? []).map(normalizeChatMessage);
        },
        [] as ChatMessage[],
        "chat history",
      ),
    [user],
  );

  const mutation = useMutation({
    mutationFn: async ({ content, history }: SendMessageInput): Promise<SendMessageResult> => {
      const conversationId = await withDemoFallback<string | null>(
        async () => {
          if (!user) return null;
          if (conversationIdRef.current) return conversationIdRef.current;

          const { data, error } = await supabase
            .from("ai_conversations")
            .insert({ user_id: user.id })
            .select("id")
            .single();

          if (error) throw error;
          return data.id as string;
        },
        null,
        "conversation create",
      );
      conversationIdRef.current = conversationId;

      const userMessage = await withDemoFallback<ChatMessage>(
        async () => {
          if (!conversationId) return { id: localId(), role: "user", content };

          const { data, error } = await supabase
            .from("ai_messages")
            .insert({ conversation_id: conversationId, role: "user", content })
            .select("id, role, content")
            .single();
          if (error) throw error;
          return normalizeChatMessage(data);
        },
        () => ({ id: localId(), role: "user" as const, content }),
        "persist user message",
      );

      const payloadMessages: AiMessage[] = [...history, { role: "user", content }].map(
        (message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content,
        }),
      );

      const aiData = await sendAiChat(payloadMessages);

      const assistantMessage = await withDemoFallback<ChatMessage>(
        async () => {
          if (!conversationId) {
            return { id: localId(), role: "assistant", content: aiData.content };
          }

          const { data, error } = await supabase
            .from("ai_messages")
            .insert({
              conversation_id: conversationId,
              role: "assistant",
              content: aiData.content,
            })
            .select("id, role, content")
            .single();
          if (error) throw error;

          // Track which provider answered at the conversation level (schema
          // has no per-message provider column).
          await supabase
            .from("ai_conversations")
            .update({ model: aiData.provider, updated_at: new Date().toISOString() })
            .eq("id", conversationId);

          return normalizeChatMessage(data);
        },
        () => ({ id: localId(), role: "assistant" as const, content: aiData.content }),
        "persist assistant message",
      );

      return { userMessage, assistantMessage, provider: aiData.provider };
    },
  });

  return {
    sendMessage: mutation.mutateAsync,
    isSending: mutation.isPending,
    loadConversationHistory,
  };
}
