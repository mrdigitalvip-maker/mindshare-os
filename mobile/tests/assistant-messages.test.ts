import assert from "node:assert/strict";
import test from "node:test";
import { reconcileAssistantMessages } from "../lib/assistant-messages";
import type { ChatMessage } from "../services/chat-service";

const message = (id: string, role: ChatMessage["role"] = "user"): ChatMessage => ({
  id,
  role,
  content: `${role}-${id}`,
  createdAt: null,
  attachments: [],
});

test("returns persisted messages without changing their identity", () => {
  const persisted = [message("user-1"), message("assistant-1", "assistant")];
  assert.deepEqual(reconcileAssistantMessages(persisted), persisted);
});

test("returns an optimistic message when there is no persisted history", () => {
  const optimistic = message("request-1");
  assert.deepEqual(reconcileAssistantMessages([], optimistic), [optimistic]);
});

test("appends an optimistic message with a different request ID", () => {
  assert.deepEqual(
    reconcileAssistantMessages([message("persisted")], message("optimistic")),
    [message("persisted"), message("optimistic")],
  );
});

test("prefers the server message when it reconciles the optimistic request ID", () => {
  const server = { ...message("request-1"), createdAt: "2026-08-25T10:00:00.000Z" };
  const optimistic = { ...message("request-1"), createdAt: null };
  const reconciled = reconcileAssistantMessages([server], optimistic);

  assert.equal(reconciled.length, 1);
  assert.equal(reconciled[0], server);
});

test("retry IDs and an arriving assistant reply remain unique", () => {
  const retry = message("stable-request-id");
  const assistant = message("assistant-response", "assistant");
  const reconciled = reconcileAssistantMessages([retry, retry, assistant], retry);

  assert.deepEqual(reconciled, [retry, assistant]);
  assert.equal(new Set(reconciled.map(({ id }) => id)).size, reconciled.length);
});
