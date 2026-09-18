import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const passport = read("supabase/migrations/202609180016_e39_passport_profile_rls_index.sql");
const creator = read("supabase/migrations/202609180017_e40_creator_core_rls_initplan.sql");
const passportWeb = read("src/services/passport-web-service.ts");
const creatorWeb = read("src/services/creator-service.ts");

test("E39 preserves canonical Passport profile usage on Web", () => {
  assert.match(passportWeb, /\.from\("passport_profiles"\)/);
  assert.match(passportWeb, /\.eq\("user_id", userId\)/);
  assert.match(passportWeb, /track_id/);
});

test("E39 covers passport_profiles.track_id without destructive index changes", () => {
  assert.match(
    passport,
    /create index if not exists passport_profiles_track_id_idx\s+on public\.passport_profiles\(track_id\)/,
  );
  assert.doesNotMatch(passport, /drop index/i);
});

test("E39 preserves authenticated owner CRUD and makes auth initplan-safe", () => {
  for (const policy of [
    "passport profile owner select",
    "passport profile owner insert",
    "passport profile owner update",
    "passport profile owner delete",
  ]) {
    assert.match(passport, new RegExp(`create policy "${policy}"`));
  }
  assert.match(passport, /to authenticated/);
  assert.match(passport, /user_id = \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(passport, /user_id = auth\.uid\(\)/);
});

test("E40 preserves canonical Creator profile and project tables on Web", () => {
  assert.match(creatorWeb, /\.from\("creator_profiles"\)/);
  assert.match(creatorWeb, /\.from\("creator_projects"\)/);
  assert.match(creatorWeb, /\.eq\("user_id", userId\)/);
});

test("E40 keeps Creator owner-only ALL policies and makes auth initplan-safe", () => {
  for (const policy of ["creator_profiles_owner_all", "creator_projects_owner_all"]) {
    assert.match(creator, new RegExp(`create policy ${policy}`));
  }
  const allPolicies = creator.match(/for all\s+to authenticated/g) ?? [];
  assert.equal(allPolicies.length, 2);
  assert.match(creator, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(creator, /with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.doesNotMatch(creator, /auth\.uid\(\) = user_id/);
});
