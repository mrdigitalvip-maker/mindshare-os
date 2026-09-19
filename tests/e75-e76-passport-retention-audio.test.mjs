import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const migration = read("supabase/migrations/202609190310_e75_passport_retention_summary.sql");
const webPassport = read("src/routes/_shell.passport.tsx");
const webService = read("src/services/passport-web-service.ts");
const voiceEdge = read("supabase/functions/nexora-voice/index.ts");
const voiceProvider = read("src/services/voice-provider.ts");

test("E75 derives Passport retention from persisted owner activity", () => {
  assert.match(migration, /get_passport_retention_summary/);
  assert.match(migration, /studio_progress/);
  assert.match(migration, /passport_vocabulary_reviews/);
  assert.match(migration, /passport_daily_missions/);
  assert.match(migration, /passport_roleplay_sessions/);
  assert.match(migration, /where p\.user_id = uid/);
  assert.match(migration, /grant execute on function public\.get_passport_retention_summary\(uuid\) to authenticated/);
  assert.doesNotMatch(migration, /create table .*streak/i);
});

test("E75 exposes the same retention summary on Web", () => {
  assert.match(webService, /getWebPassportRetentionSummary/);
  assert.match(webService, /get_passport_retention_summary/);
  assert.match(webPassport, /retention\?\.currentStreak/);
  assert.match(webPassport, /retention\?\.activeDaysLast7/);
  assert.match(webPassport, /retention\?\.longestStreak/);
});

test("E76 Passport repeat practice transcribes microphone audio without persisting raw recordings", () => {
  assert.match(webPassport, /navigator\.mediaDevices\.getUserMedia\(\{ audio: true \}\)/);
  assert.match(webPassport, /new MediaRecorder/);
  assert.match(webPassport, /transcribeVoiceAudio/);
  assert.match(voiceProvider, /form\.append\("action", "transcribe"\)/);
  assert.match(voiceEdge, /body\?\.action === "transcribe"/);
  assert.doesNotMatch(voiceEdge, /storage\.from|\.upload\(/);
});

test("E76 supports all current Passport languages and labels the result honestly", () => {
  assert.match(voiceEdge, /return "es"/);
  assert.match(voiceEdge, /return "fr"/);
  assert.match(webPassport, /Text match/);
  assert.match(webPassport, /Correspondência de texto/);
  assert.match(webPassport, /not an accent or pronunciation score/);
  assert.match(webPassport, /Não é uma nota de sotaque ou pronúncia/);
});
