import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

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
  provider: "gemini" | "grok";
}

async function ensureConversation(userId: string, existingId: string | null): Promise<string> {
  if (existingId) return existingId;

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: userId })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

/**
 * Handles a single-conversation Assistant chat: lazily creates the
 * `ai_conversations` row on the first message, persists every user and
 * assistant message to `ai_messages`, and calls the `ai-chat` Edge
 * Function for the model response (Gemini, falling back to Grok).
 *
 * Schema note: `ai_messages` has no per-message provider column — which
 * model answered is tracked at the conversation level, in
 * `ai_conversations.model`, updated after every exchange.
 */
export function useChat() {
  const { user } = useAuth();
  const conversationIdRef = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ content, history }: SendMessageInput): Promise<SendMessageResult> => {
      if (!user) throw new Error("You must be signed in to chat.");

      const conversationId = await ensureConversation(user.id, conversationIdRef.current);
      conversationIdRef.current = conversationId;

      const { data: userRow, error: userInsertError } = await supabase
        .from("ai_messages")
        .insert({ conversation_id: conversationId, role: "user", content })
        .select("id, role, content")
        .single();
      if (userInsertError) throw userInsertError;

      const payloadMessages = [...history, { role: "user" as const, content }].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data: aiData, error: aiError } = await supabase.functions.invoke<{
        content: string;
        provider: "gemini" | "grok";
      }>("ai-chat", { body: { messages: payloadMessages } });

      if (aiError) throw aiError;
      if (!aiData) throw new Error("Empty response from the assistant");

      const { data: assistantRow, error: assistantInsertError } = await supabase
        .from("ai_messages")
        .insert({
          conversation_id: conversationId,
          role: "assistant",
          content: aiData.content,
        })
        .select("id, role, content")
        .single();
      if (assistantInsertError) throw assistantInsertError;

      // Track which provider answered at the conversation level (schema
      // has no per-message provider column).
      await supabase
        .from("ai_conversations")
        .update({ model: aiData.provider, updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      return {
        userMessage: { id: userRow.id as string, role: "user", content: userRow.content as string },
        assistantMessage: {
          id: assistantRow.id as string,
          role: "assistant",
          content: assistantRow.content as string,
        },
        provider: aiData.provider,
      };
    },
  });

  return {
    sendMessage: mutation.mutateAsync,
    isSending: mutation.isPending,
  };
}
