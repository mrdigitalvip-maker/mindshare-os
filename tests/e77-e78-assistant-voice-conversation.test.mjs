import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const assistant = readFileSync(
  new URL("../src/routes/_shell.assistant.tsx", import.meta.url),
  "utf8",
);

test("E77 voice conversation is explicit opt-in and sends transcribed turns through existing chat", () => {
  assert.match(assistant, /voiceConversationMode/);
  assert.match(assistant, /Conversa por voz ativa/);
  assert.match(assistant, /send\(transcript, \{ fromVoice: true, speakReply: true \}\)/);
  assert.match(assistant, /transcribeVoiceAudio/);
  assert.match(assistant, /Toque no microfone para cada turno/);
});

test("E77 automatically speaks Assistant replies only inside voice conversation", () => {
  assert.match(assistant, /options\.speakReply \|\| voiceConversationMode/);
  assert.match(assistant, /await speakMessage\(result\.assistantMessage\)/);
  assert.match(assistant, /ElevenLabsVoiceProvider/);
  assert.match(assistant, /FallbackVoiceProvider/);
});

test("E78 voice conversation pauses for pending action review and never auto-confirms", () => {
  assert.match(assistant, /Revise a ação proposta antes de continuar a conversa por voz/);
  assert.match(assistant, /item\.status === "pending" \|\| item\.status === "failed"/);
  assert.match(assistant, /confirmed: true/);
  assert.match(assistant, /onConfirm=\{\(item\) => void confirmAction\(item\)\}/);
  assert.doesNotMatch(assistant, /confirmAction\(result/);
  assert.doesNotMatch(assistant, /applyNexoraAction\(\{[^}]*fromVoice/s);
});

test("E78 switching chats ends the local voice session", () => {
  const resetCount = (assistant.match(/setVoiceConversationMode\(false\)/g) ?? []).length;
  assert.ok(resetCount >= 3);
  assert.match(assistant, /cancelVoiceInput\(\);\s*stopSpeaking\(\);\s*setVoiceConversationMode\(false\)/);
});
