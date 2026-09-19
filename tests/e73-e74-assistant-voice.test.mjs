import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const voice = read("supabase/functions/nexora-voice/index.ts");
const provider = read("src/services/voice-provider.ts");
const assistant = read("src/routes/_shell.assistant.tsx");

test("E73 transcribes authenticated audio server-side without persisting raw recordings", () => {
  assert.match(voice, /client\.auth\.getUser\(\)/);
  assert.match(voice, /body\?\.action === "transcribe"/);
  assert.match(voice, /OPENAI_API_KEY/);
  assert.match(voice, /gpt-4o-mini-transcribe/);
  assert.match(voice, /MAX_AUDIO_BYTES = 6 \* 1024 \* 1024/);
  assert.match(voice, /request\.formData\(\)/);
  assert.match(voice, /api\.openai\.com\/v1\/audio\/transcriptions/);
  assert.doesNotMatch(voice, /storage\.from|\.upload\(/);
});

test("E73 Web push-to-talk returns transcript to the composer for review", () => {
  assert.match(provider, /form\.append\("action", "transcribe"\)/);
  assert.match(provider, /supabase\.functions\.invoke<\{ text\?: string \}>\("nexora-voice"/);
  assert.match(assistant, /navigator\.mediaDevices\.getUserMedia\(\{ audio: true \}\)/);
  assert.match(assistant, /new MediaRecorder/);
  assert.match(assistant, /transcribeVoiceAudio/);
  assert.match(assistant, /appendTranscript\(transcript\)/);
  assert.match(assistant, /Áudio transcrito\. Revise antes de enviar\./);
  assert.doesNotMatch(assistant, /appendTranscript\(transcript\);\s*void send/);
});

test("E74 Web spoken responses prefer server voice and fail safely to browser speech", () => {
  assert.match(assistant, /new ElevenLabsVoiceProvider\(\)/);
  assert.match(assistant, /new FallbackVoiceProvider\(\)/);
  assert.match(assistant, /if \(await server\.isAvailable\(\)\)/);
  assert.match(assistant, /await server\.speak\(message\.content\)/);
  assert.match(assistant, /await fallback\.speak\(message\.content\)/);
  assert.match(assistant, /aria-label=\{speaking \? "Parar áudio" : "Ouvir resposta"\}/);
});

test("E73/E74 preserve explicit approval for proposed actions", () => {
  assert.match(assistant, /confirmed: true/);
  assert.match(assistant, /Revise antes de confirmar/);
  assert.match(assistant, /onConfirm=\{\(item\) => void confirmAction\(item\)\}/);
});
