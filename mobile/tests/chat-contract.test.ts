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
  assert.deepEqual(
    buildAssistantSendPayload(
      "  olá  ",
      " conversation-1 ",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ),
    {
      action: "send",
      message: "olá",
      conversationId: "conversation-1",
      requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    },
  );
  assert.throws(() =>
    buildAssistantSendPayload("  ", null, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
  );
});

test("creates UUID-shaped request IDs accepted by ai_messages.id", () => {
  const id = createAssistantRequestId(() => 0.5);
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("rejects malformed request IDs before invoking ai-chat", () => {
  assert.throws(() => buildAssistantSendPayload("oi", null, "mobile-123"), /invalid_request_id/);
  assert.equal(classifyAssistantError("invalid_request_id"), "VALIDATION");
});

test("text-only send does not require or serialize attachments", () => {
  const payload = buildAssistantSendPayload(
    "Vjbgbgunv",
    null,
    "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  );
  assert.equal("attachments" in payload, false);
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

test("serializes and parses private attachment metadata", async () => {
  const attachment = {
    id: "a",
    kind: "image" as const,
    name: "foto.jpg",
    mimeType: "image/jpeg",
    size: 20,
    storagePath: "user/request/a.jpg",
  };
  assert.deepEqual(
    buildAssistantSendPayload("Veja", null, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", [attachment])
      .attachments,
    [attachment],
  );
  const { parseWireAttachments } = await import("../lib/chat-contract.ts");
  assert.deepEqual(parseWireAttachments([attachment]), [attachment]);
  assert.deepEqual(
    parseWireAttachments([{ ...attachment, storagePath: "https://evil.test/x" }]),
    [],
  );
});
