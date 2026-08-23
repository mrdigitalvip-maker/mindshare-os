import assert from "node:assert/strict";
import test from "node:test";
import {
  boundWorkspaceContext,
  buildMultimodalUserContent,
  validateAttachmentMetadata,
} from "../../supabase/functions/_shared/assistant-context.ts";
import { nextSpeechState } from "../lib/speech-state.ts";
const user = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const image = {
  id: "x",
  kind: "image" as const,
  name: "x.jpg",
  mimeType: "image/jpeg",
  size: 100,
  storagePath: `${user}/request/x.jpg`,
};
test("rejects wrong attachment ownership, MIME, and size", () => {
  assert.throws(
    () => validateAttachmentMetadata([{ ...image, storagePath: "other/request/x.jpg" }], user),
    /attachment_ownership/,
  );
  assert.throws(
    () => validateAttachmentMetadata([{ ...image, mimeType: "image/svg+xml" }], user),
    /attachment_type/,
  );
  assert.throws(
    () => validateAttachmentMetadata([{ ...image, size: 6291457 }], user),
    /attachment_size/,
  );
});
test("builds multimodal and remains text-only compatible", () => {
  assert.equal(buildMultimodalUserContent("oi"), "oi");
  const value = buildMultimodalUserContent("analise", {
    mimeType: "image/jpeg",
    dataUrl: "data:image/jpeg;base64,AA==",
  });
  assert.equal(Array.isArray(value), true);
});
test("bounds workspace context", () =>
  assert.ok(
    boundWorkspaceContext({ tasks: Array(50).fill({ title: "x" }), projects: [], studies: [] }, 500)
      .length <= 500,
  ));
test("speech state permits one response and toggles stop", () => {
  assert.deepEqual(nextSpeechState({ speakingId: null }, "one"), { speakingId: "one" });
  assert.deepEqual(nextSpeechState({ speakingId: "one" }, "one"), { speakingId: null });
  assert.deepEqual(nextSpeechState({ speakingId: "one" }, "two"), { speakingId: "two" });
});
