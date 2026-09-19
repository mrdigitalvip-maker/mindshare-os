import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const edge = read("supabase/functions/nexora-voice/index.ts");
const provider = read("src/services/voice-provider.ts");
const assistant = read("src/routes/_shell.assistant.tsx");
const mobile = read("mobile/services/assistant-voice-service.ts");

test("voice edge accepts MediaRecorder codec MIME parameters", () => {
  assert.match(edge, /file\.type\.toLowerCase\(\)\.split\(";"\)/);
  assert.match(edge, /SUPPORTED_AUDIO_TYPES\.has\(type\)/);
  assert.match(edge, /SUPPORTED_AUDIO_EXTENSIONS\.has\(extension\)/);
  assert.match(edge, /type\.startsWith\("audio\/"\)/);
  assert.match(edge, /type\.startsWith\("video\/"\)/);
  assert.match(assistant, /"audio\/webm;codecs=opus"/);
});

test("voice availability exposes provider configuration and entitlement truth", () => {
  assert.match(edge, /speechConfigured,/);
  assert.match(edge, /transcriptionConfigured,/);
  assert.match(edge, /premiumOnly,/);
  assert.match(edge, /entitled,/);
  assert.match(provider, /reachable\?: boolean/);
});

test("Web and native preserve useful server transcription error states", () => {
  for (const source of [provider, mobile]) {
    for (const code of [
      "premium_required",
      "provider_unavailable",
      "provider_rate_limited",
      "invalid_audio",
      "empty_transcription",
      "timeout",
      "unauthorized",
    ]) {
      assert.match(source, new RegExp(code));
    }
    assert.match(source, /voiceFunctionErrorCode/);
  }
});

test("recordings remain transient, authenticated and bounded", () => {
  assert.match(edge, /client\.auth\.getUser\(\)/);
  assert.match(edge, /MAX_AUDIO_BYTES = 6 \* 1024 \* 1024/);
  assert.match(edge, /TRANSCRIPTION_TIMEOUT_MS = 30_000/);
  assert.doesNotMatch(edge, /storage\.from|\.upload\(/);
});
