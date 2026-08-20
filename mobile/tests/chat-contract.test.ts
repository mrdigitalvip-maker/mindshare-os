import assert from "node:assert/strict";
import test from "node:test";

import {
  assistantErrorCopy,
  buildAssistantSendPayload,
  classifyAssistantError,
  createAssistantRequestId,
  validateAssistantSendData,
} from "../lib/chat-contract.ts";

test("builds the exact ai-chat send payload and trims user input", () => {
  assert.deepEqual(buildAssistantSendPayload("  olá  ", " conversation-1 ", "request-1"), {
    action: "send",
    message: "olá",
    conversationId: "conversation-1",
    requestId: "request-1",
  });
  assert.throws(() => buildAssistantSendPayload("  ", null, "request-1"));
});

test("creates UUID-shaped request IDs accepted by ai_messages.id", () => {
  const id = createAssistantRequestId(() => 0.5);
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("validates and normalizes a successful Edge Function response", () => {
  const response = {
    conversationId: "conversation-1",
    userMessage: { id: "user-1", role: "user", content: "Olá" },
    assistantMessage: {
      id: "assistant-1",
      role: "assistant",
      content: "Como posso ajudar?",
      created_at: "2026-08-20T12:00:00Z",
    },
  };
  assert.deepEqual(validateAssistantSendData(response), response);
});

test("rejects malformed, empty, and role-swapped responses", () => {
  assert.throws(() => validateAssistantSendData(null), /invalid_response/);
  assert.throws(() =>
    validateAssistantSendData({
      conversationId: "conversation-1",
      userMessage: { id: "user-1", role: "assistant", content: "wrong" },
      assistantMessage: { id: "assistant-1", role: "assistant", content: "" },
    }),
  );
});

test("classifies failures and keeps product-safe PT-BR copy", () => {
  assert.equal(classifyAssistantError("unauthorized"), "AUTH");
  assert.equal(classifyAssistantError("free_limit_reached"), "RATE_LIMIT");
  assert.equal(classifyAssistantError("persistence_error"), "PERSISTENCE");
  assert.equal(classifyAssistantError("provider_error"), "AI_PROVIDER");
  assert.deepEqual(assistantErrorCopy("provider_error"), {
    title: "Não foi possível enviar.",
    detail: "Sua mensagem foi preservada. Tente novamente.",
  });
});
