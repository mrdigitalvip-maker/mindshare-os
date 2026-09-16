import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [migration, webService, mobileHome, roleplay] = await Promise.all([
  readFile(new URL("../supabase/migrations/20260916120000_passport_daily_missions_runtime.sql", import.meta.url), "utf8"),
  readFile(new URL("../src/services/passport-web-service.ts", import.meta.url), "utf8"),
  readFile(new URL("../mobile/services/passport-home-service.ts", import.meta.url), "utf8"),
  readFile(new URL("../supabase/functions/passport-roleplay/index.ts", import.meta.url), "utf8"),
]);

test("Passport daily missions are owner-scoped and idempotent", () => {
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /passport_profiles/);
  assert.match(migration, /on conflict\(user_id, track_id, mission_date, mission_key\) do nothing/i);
  assert.match(migration, /daily-vocabulary-v1/);
  assert.match(migration, /daily-listening-v1/);
  assert.match(migration, /daily-speaking-v1/);
  assert.match(migration, /grant execute on function public\.ensure_passport_daily_missions/i);
});

test("Web Passport ensures missions before reading and supports real vocabulary persistence", () => {
  assert.match(webService, /rpc\("ensure_passport_daily_missions"/);
  assert.match(webService, /export async function addWebPassportVocabulary/);
  assert.match(webService, /\.from\("passport_vocabulary"\)/);
  assert.match(webService, /user_id: uid/);
  assert.match(webService, /review_passport_vocabulary/);
});

test("mobile Passport source ensures the same daily mission contract", () => {
  assert.match(mobileHome, /ensure_passport_daily_missions/);
  assert.match(mobileHome, /p_track_id: profile\.trackId/);
  assert.match(mobileHome, /listPassportDailyMissions\(uid, profile\.trackId, date\)/);
});

test("Passport role-play remains authenticated and server-backed", () => {
  assert.match(roleplay, /Authorization/);
  assert.match(roleplay, /passport_roleplay_sessions/);
  assert.match(roleplay, /claim_feature_usage/);
  assert.match(roleplay, /OPENAI_API_KEY/);
});
