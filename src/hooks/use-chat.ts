import { useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { AIService, type AiChatMessage, type AiSendResult } from "@/services/ai-service";

export type ChatMessage = AiChatMessage;

interface SendMessageInput {
  content: string;
  requestId: string;
}

/** Keeps UI state thin: authentication, ownership, limits, context, and persistence live in ai-chat. */
export function useChat() {
  const conversationIdRef = useRef<string | null>(null);

  const loadConversationHistory = useCallback(async (): Promise<ChatMessage[]> => {
    const result = await AIService.loadHistory();
    conversationIdRef.current = result.conversationId;
    return result.messages;
  }, []);

  const mutation = useMutation<AiSendResult, Error, SendMessageInput>({
    mutationFn: async ({ content, requestId }) => {
      const result = await AIService.sendChat({
        message: content,
        conversationId: conversationIdRef.current,
        requestId,
      });
      conversationIdRef.current = result.conversationId;
      return result;
    },
    retry: false,
  });

  return {
    sendMessage: mutation.mutateAsync,
    isSending: mutation.isPending,
    loadConversationHistory,
  };
}
