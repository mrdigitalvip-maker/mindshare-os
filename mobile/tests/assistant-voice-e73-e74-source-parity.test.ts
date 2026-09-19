import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const assistant = source("../app/(app)/(tabs)/assistant-chat.tsx");
const voiceService = source("../services/assistant-voice-service.ts");
const packageJson = source("../package.json");
const appJson = source("../app.json");
const edgeVoice = source("../../supabase/functions/nexora-voice/index.ts");

describe("E73/E74 Assistant voice source parity", () => {
  test("Android records real microphone audio with the Expo 54 audio API", () => {
    expect(packageJson).toContain('"expo-audio": "~1.1.1"');
    expect(appJson).toContain('"expo-audio"');
    expect(appJson).toContain("android.permission.RECORD_AUDIO");
    expect(assistant).toContain("useAudioRecorder(RecordingPresets.HIGH_QUALITY)");
    expect(assistant).toContain("AudioModule.requestRecordingPermissionsAsync()");
    expect(assistant).toContain("audioRecorder.prepareToRecordAsync()");
    expect(assistant).toContain("audioRecorder.record()");
    expect(assistant).toContain("await audioRecorder.stop()");
  });

  test("Android sends audio only to the authenticated voice edge and puts transcription in the draft", () => {
    expect(voiceService).toContain('form.append("action", "transcribe")');
    expect(voiceService).toContain('supabase.functions.invoke<{ text?: string }>("nexora-voice"');
    expect(assistant).toContain("transcribeAssistantRecording(uri, resolvedLocale)");
    expect(assistant).toContain("setDraft((current) =>");
    expect(assistant).not.toContain("submit(transcript");
  });

  test("server transcription is bounded, authenticated and does not store raw audio", () => {
    expect(edgeVoice).toContain("client.auth.getUser()");
    expect(edgeVoice).toContain("MAX_AUDIO_BYTES = 6 * 1024 * 1024");
    expect(edgeVoice).toContain("gpt-4o-mini-transcribe");
    expect(edgeVoice).toContain("https://api.openai.com/v1/audio/transcriptions");
    expect(edgeVoice).not.toContain("storage.from");
  });

  test("E74 keeps native spoken output and the approval boundary intact", () => {
    expect(assistant).toContain("Speech.speak(item.content");
    expect(assistant).toContain("confirmed: true");
    expect(assistant).toContain("Confirmar");
    expect(assistant).toContain("Cancelar");
  });
});
