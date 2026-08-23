import assert from "node:assert/strict";
import test from "node:test";

import {
  ASSISTANT_QUICK_ACTIONS,
  attachmentFromPickerAsset,
  canSendAssistantMessage,
  removeAssistantAttachment,
  resolveQuickAction,
} from "../lib/assistant-composer.ts";

const image = attachmentFromPickerAsset(
  {
    uri: "file:///photo.png",
    fileName: "photo.png",
    mimeType: "image/png",
    fileSize: 42,
  },
  "image",
  "attachment-1",
)!;

test("send validity accepts text or an attachment, but never while busy", () => {
  assert.equal(canSendAssistantMessage("   ", null, false), false);
  assert.equal(canSendAssistantMessage(" olá ", null, false), true);
  assert.equal(canSendAssistantMessage("", image, false), true);
  assert.equal(canSendAssistantMessage("olá", image, true), false);
});

test("picker cancellation and missing asset metadata normalize safely", () => {
  assert.equal(attachmentFromPickerAsset(undefined, "image", "id"), null);
  assert.deepEqual(attachmentFromPickerAsset({ uri: "file:///x" }, "document", "id"), {
    id: "id",
    uri: "file:///x",
    kind: "document",
    name: "arquivo.txt",
    mimeType: "text/plain",
    size: 0,
  });
});

test("picker assets preserve the supported image/document type mapping", () => {
  assert.equal(image.kind, "image");
  assert.equal(image.mimeType, "image/png");
  const document = attachmentFromPickerAsset(
    { uri: "file:///notes.txt", name: "notes.txt", mimeType: "text/plain", size: 12 },
    "document",
    "attachment-2",
  );
  assert.equal(document?.kind, "document");
  assert.equal(document?.name, "notes.txt");
});

test("attachment removal is deterministic", () => {
  assert.equal(removeAssistantAttachment(), null);
});

test("quick actions deterministically populate a prompt or open a real picker", () => {
  const prompt = ASSISTANT_QUICK_ACTIONS.find((action) => action.type === "prompt")!;
  const gallery = ASSISTANT_QUICK_ACTIONS.find((action) => action.type === "gallery")!;
  assert.match(resolveQuickAction(prompt).draft, /tarefas|projeto|dia/i);
  assert.deepEqual(resolveQuickAction(gallery), { draft: "", picker: "gallery" });
});
