import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
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

test("ai-chat retry resolves the original conversation before inserting", () => {
  const source = readFileSync("../supabase/functions/ai-chat/index.ts", "utf8");
  const lookup = source.indexOf('.eq("id", body.requestId)');
  const conversationCreation = source.indexOf("if (!conversationId) {", lookup);
  const insert = source.indexOf('.from("ai_messages").insert', conversationCreation);
  assert.ok(lookup > 0 && conversationCreation > lookup && insert > conversationCreation);
  assert.match(
    source.slice(lookup, conversationCreation),
    /conversationId = priorRequest\.conversation_id/,
  );
});

test("ai-chat prevents request ID reuse for a different message or conversation", () => {
  const source = readFileSync("../supabase/functions/ai-chat/index.ts", "utf8");
  assert.match(source, /priorRequest\.content !== message/);
  assert.match(source, /conversationId !== priorRequest\.conversation_id/);
  assert.match(source, /if \(duplicate\)[\s\S]*completedReply/);
});

test("ai-chat uses the supported strict JSON schema subset and safe provider diagnostics", () => {
  const source = readFileSync("../supabase/functions/ai-chat/index.ts", "utf8");
  assert.doesNotMatch(source, /message: \{ type: "string", minLength:/);
  assert.match(source, /type: "json_schema"/);
  assert.match(source, /strict: true/);
  assert.match(source, /param: safeProviderErrorField\(fields\.param\)/);
  assert.match(source, /message: safeProviderErrorField\(fields\.message, 300\)/);
});
