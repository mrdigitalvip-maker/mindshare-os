import assert from "node:assert/strict";
import test from "node:test";

import {
  CHAT_ATTACHMENT_MAX_BYTES,
  assistantCapabilities,
  formatFileSize,
  validateChatAttachment,
} from "../lib/chat-attachments.ts";

test("accepts only supported image and document MIME types", () => {
  assert.equal(validateChatAttachment({ kind: "image", mimeType: "image/jpeg", size: 20 }), null);
  assert.equal(validateChatAttachment({ kind: "document", mimeType: "text/plain", size: 20 }), null);
  assert.equal(validateChatAttachment({ kind: "document", mimeType: "application/pdf", size: 20 }), "ATTACHMENT_TYPE");
  assert.equal(validateChatAttachment({ kind: "image", mimeType: "image/svg+xml", size: 20 }), "ATTACHMENT_TYPE");
});

test("enforces the centralized six MiB limit", () => {
  assert.equal(validateChatAttachment({ kind: "image", mimeType: "image/png", size: CHAT_ATTACHMENT_MAX_BYTES + 1 }), "ATTACHMENT_SIZE");
  assert.equal(formatFileSize(CHAT_ATTACHMENT_MAX_BYTES), "6.0 MB");
});

test("does not expose unavailable native controls", () => {
  assert.equal(assistantCapabilities.imageUpload, false);
  assert.equal(assistantCapabilities.voiceRecording, false);
});
