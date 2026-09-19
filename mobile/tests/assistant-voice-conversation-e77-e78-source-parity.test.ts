import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const assistant = readFileSync(
  fileURLToPath(new URL("../app/(app)/(tabs)/assistant-chat.tsx", import.meta.url)),
  "utf8",
);

describe("E77/E78 Assistant voice conversation parity", () => {
  test("Android voice conversation is explicit opt-in and auto-sends only voice turns", () => {
    expect(assistant).toContain("voiceConversationMode");
    expect(assistant).toContain("Conversa por voz ativa");
    expect(assistant).toContain("transcriptToSend");
    expect(assistant).toContain('submit(transcriptToSend, undefined, undefined, { fromVoice: true })');
    expect(assistant).toContain("const currentAttachment = options.fromVoice ? null : attachment");
  });

  test("Android speaks the Assistant reply while voice conversation is active", () => {
    expect(assistant).toContain("speakAssistantMessage");
    expect(assistant).toContain("await speakAssistantMessage(result.assistantMessage)");
    expect(assistant).toContain("Speech.speak(item.content");
  });

  test("voice mode cannot bypass action review", () => {
    expect(assistant).toContain("Revise a ação proposta antes de continuar a conversa por voz.");
    expect(assistant).toContain('item.status === "pending" || item.status === "failed"');
    expect(assistant).toContain("confirmed: true");
    expect(assistant).toContain("Confirmar");
    expect(assistant).not.toContain("confirmAction(result");
  });

  test("voice conversation blocks attachments to avoid accidental auto-send", () => {
    expect(assistant).toContain("Remove the attachment before starting a voice conversation.");
    expect(assistant).toContain("disabled={busy || voiceConversationMode}");
  });
});
