import assert from "node:assert/strict";
import test from "node:test";
import {
  assistantEntryState,
  conversationTitleFromMessage,
  isGenericConversationTitle,
  mapConversationRows,
  newAssistantChatState,
  selectedAssistantChatState,
  stableConversationTitle,
} from "../lib/assistant-conversations";

test("assistant entry stays on home and does not select the latest conversation", () => {
  assert.deepEqual(assistantEntryState(), { screen: "home" });
});
test("new chat is isolated with a null id and selection uses the exact id", () => {
  const previous = selectedAssistantChatState("previous-id");
  assert.deepEqual(previous, { screen: "conversation", conversationId: "previous-id" });
  assert.deepEqual(newAssistantChatState(), { screen: "conversation", conversationId: null });
  assert.notDeepEqual(newAssistantChatState(), previous);
});

test("conversation list is selected by descending activity", () => {
  assert.deepEqual(
    mapConversationRows([
      { id: "old", title: "Old", updated_at: "2026-01-01" },
      { id: "new", title: "New", updated_at: "2026-02-01" },
    ]).map((x) => x.id),
    ["new", "old"],
  );
});
test("title comes from the first meaningful message without links or quotes", () => {
  assert.equal(
    conversationTitleFromMessage("  “Organizar minhas tarefas da semana?”  "),
    "Organizar minhas tarefas da semana",
  );
  assert.equal(conversationTitleFromMessage("https://example.com"), "Conversa com a NEXORA");
});
test("title truncates at a word boundary", () => {
  const title = conversationTitleFromMessage(
    "Planejar uma sequência bastante detalhada de atividades importantes para toda a próxima semana",
    42,
  );
  assert.ok(title.length <= 42);
  assert.equal(title.endsWith(" "), false);
});
test("generic title is replaced once and meaningful title remains stable", () => {
  assert.equal(isGenericConversationTitle("Nova conversa"), true);
  assert.equal(stableConversationTitle("Nova conversa", "Organizar tarefas"), "Organizar tarefas");
  assert.equal(stableConversationTitle("Plano semanal", "Outro assunto"), "Plano semanal");
});
