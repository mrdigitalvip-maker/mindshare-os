import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const home = read("../services/passport-home-service.ts");
const index = read("../app/(app)/passport/index.tsx");
const listening = read("../app/(app)/passport/listening.tsx");
const voice = read("../services/assistant-voice-service.ts");
const migration = read("../../supabase/migrations/202609190310_e75_passport_retention_summary.sql");
const edge = read("../../supabase/functions/nexora-voice/index.ts");

describe("E75/E76 Passport retention and repeat practice parity", () => {
  test("Android loads server-derived retention rather than inventing a local streak", () => {
    expect(home).toContain('supabase.rpc("get_passport_retention_summary"');
    expect(home).toContain("currentStreak");
    expect(home).toContain("activeDaysLast7");
    expect(index).toContain("data?.retention.currentStreak");
    expect(migration).not.toMatch(/create table .*streak/i);
  });

  test("Passport repeat practice records microphone audio and transcribes the track language", () => {
    expect(listening).toContain("useAudioRecorder(RecordingPresets.HIGH_QUALITY)");
    expect(listening).toContain("AudioModule.requestRecordingPermissionsAsync()");
    expect(listening).toContain("audioRecorder.prepareToRecordAsync()");
    expect(listening).toContain("transcribeVoiceRecording(uri, locale)");
    expect(voice).toContain('if (normalized.startsWith("es")) return "es"');
    expect(voice).toContain('if (normalized.startsWith("fr")) return "fr"');
    expect(edge).toContain('return "es"');
    expect(edge).toContain('return "fr"');
  });

  test("repeat result is explicitly a transcription text match, not a pronunciation score", () => {
    expect(listening).toContain("textMatchPercent(current.text, transcript)");
    expect(listening).toContain("Correspondência de texto");
    expect(listening).toContain("Text match");
    expect(listening).toContain("Não é uma nota de sotaque ou pronúncia.");
    expect(listening).toContain("It is not an accent or pronunciation score.");
  });
});
