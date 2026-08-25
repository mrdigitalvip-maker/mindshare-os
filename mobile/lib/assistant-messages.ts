import type { ChatMessage } from "@/services/chat-service";

/**
 * Produces the exact message collection rendered by the Assistant.
 *
 * Persisted data is authoritative when it has the optimistic request ID. The
 * Map also protects the list from duplicated rows returned by a stale cache.
 */
export function reconcileAssistantMessages(
  persisted: ChatMessage[] = [],
  optimistic: ChatMessage | null = null,
): ChatMessage[] {
  const messagesById = new Map<string, ChatMessage>();

  for (const message of persisted) messagesById.set(message.id, message);
  if (optimistic && !messagesById.has(optimistic.id)) {
    messagesById.set(optimistic.id, optimistic);
  }

  return [...messagesById.values()];
}
