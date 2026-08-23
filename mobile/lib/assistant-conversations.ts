export type AssistantConversation = {
  id: string;
  title: string | null;
  updatedAt: string;
};

export type AssistantRouteState =
  { screen: "home" } | { screen: "conversation"; conversationId: string | null };
export const assistantEntryState = (): AssistantRouteState => ({ screen: "home" });
export const newAssistantChatState = (): AssistantRouteState => ({
  screen: "conversation",
  conversationId: null,
});
export function selectedAssistantChatState(conversationId: string): AssistantRouteState {
  const id = conversationId.trim();
  if (!id) throw new Error("conversation_id_required");
  return { screen: "conversation", conversationId: id };
}

const GENERIC_TITLES = new Set(["", "nova conversa", "new chat", "conversation", "conversa"]);

export function isGenericConversationTitle(title?: string | null): boolean {
  return GENERIC_TITLES.has((title ?? "").trim().toLocaleLowerCase());
}

export function conversationTitleFromMessage(message: string, maxLength = 56): string {
  const cleaned = message
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{20,}\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/["'“”]/g, "")
    .trim();
  const fallback = "Conversa com a NEXORA";
  if (!cleaned) return fallback;
  if (cleaned.length <= maxLength) return cleaned.replace(/[.!?,;:]+$/, "");
  const clipped = cleaned.slice(0, maxLength + 1);
  const boundary = clipped.lastIndexOf(" ");
  return clipped.slice(0, boundary >= Math.floor(maxLength * 0.6) ? boundary : maxLength).trim();
}

export function stableConversationTitle(current: string | null, firstMessage: string): string {
  return isGenericConversationTitle(current)
    ? conversationTitleFromMessage(firstMessage)
    : current!;
}

export function mapConversationRows(
  rows: Array<{ id: string; title: string | null; updated_at: string }>,
): AssistantConversation[] {
  return rows
    .map(({ id, title, updated_at }) => ({ id, title, updatedAt: updated_at }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
