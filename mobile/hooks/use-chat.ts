import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { loadConversation, loadRecentConversation, sendChat } from "@/services/chat-service";
export function useRecentConversation() {
  return useQuery({ queryKey: ["conversations", "recent"], queryFn: loadRecentConversation });
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
    }: {
      message: string;
      conversationId: string | null;
      requestId: string;
    }) => sendChat(message, conversationId, requestId),
    onSuccess: async (result) => {
      client.setQueryData(queryKeys.conversation(result.conversationId), [
        result.userMessage,
        result.assistantMessage,
      ]);
      client.setQueryData(["conversations", "recent"], {
        conversationId: result.conversationId,
        messages: [result.userMessage, result.assistantMessage],
      });
      await client.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}
