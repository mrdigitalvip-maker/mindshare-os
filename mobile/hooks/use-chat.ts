import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  listConversations,
  loadConversation,
  loadRecentConversation,
  sendChat,
} from "@/services/chat-service";
import type { ChatMessage } from "@/services/chat-service";
import type { ChatAttachment } from "@/lib/chat-attachments";
export function useRecentConversation() {
  return useQuery({ queryKey: ["conversations", "recent"], queryFn: loadRecentConversation });
}
export function useConversations() {
  return useQuery({ queryKey: queryKeys.conversations, queryFn: listConversations });
}
export function useConversation(conversationId: string | null) {
  return useQuery({
    queryKey: conversationId ? queryKeys.conversation(conversationId) : ["conversations", "new"],
    queryFn: () => loadConversation(conversationId!),
    enabled: Boolean(conversationId),
  });
}
export function useSendChat() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      message,
      conversationId,
      requestId,
      attachments,
    }: {
      message: string;
      conversationId: string | null;
      requestId: string;
      attachments?: ChatAttachment[];
    }) => sendChat(message, conversationId, requestId, attachments),
    onSuccess: async (result) => {
      const appendUnique = (messages: ChatMessage[] = []) => {
        const byId = new Map(messages.map((message) => [message.id, message]));
        byId.set(result.userMessage.id, result.userMessage);
        byId.set(result.assistantMessage.id, result.assistantMessage);
        return [...byId.values()];
      };
      client.setQueryData(queryKeys.conversation(result.conversationId), appendUnique);
      await client.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}
