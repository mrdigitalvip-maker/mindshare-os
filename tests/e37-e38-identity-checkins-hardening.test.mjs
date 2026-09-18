import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const identity = read("supabase/migrations/202609180014_e37_identity_preferences_rls_initplan.sql");
const checkins = read("supabase/migrations/202609180015_e38_project_checkins_rls_index.sql");
const profileService = read("src/services/profile-service.ts");
const settingsService = read("src/services/settings-service.ts");

test("E37 preserves canonical Web profile and preferences tables", () => {
  assert.match(profileService, /\.from\("profiles"\)/);
  assert.match(settingsService, /\.from\("user_preferences"\)/);
  assert.match(settingsService, /\.eq\("user_id", userId\)/);
});

test("E37 keeps profile CRUD scope unchanged while making auth evaluation initplan-safe", () => {
  for (const policy of [
    "Users can read own profile",
    "Users can insert own profile",
    "Users can update own profile",
  ]) {
    assert.match(identity, new RegExp(`create policy "${policy}"`));
  }
  assert.match(identity, /using \(\(select auth\.uid\(\)\) = id\)/);
  assert.match(identity, /with check \(\(select auth\.uid\(\)\) = id\)/);
  assert.doesNotMatch(identity, /auth\.uid\(\) = id/);
  assert.doesNotMatch(identity, /delete/i);
});

test("E37 keeps preferences owner-scoped and does not add delete access", () => {
  for (const policy of ["preferences_select", "preferences_insert", "preferences_update"]) {
    assert.match(identity, new RegExp(`create policy ${policy}`));
  }
  assert.match(identity, /\(select auth\.uid\(\)\) = user_id/);
  assert.doesNotMatch(identity, /preferences_delete/);
  assert.doesNotMatch(identity, /security definer/i);
});

test("E38 adds the missing project_id-leading FK index without removing the existing composite index", () => {
  assert.match(
    checkins,
    /create index if not exists project_check_ins_project_id_idx\s+on public\.project_check_ins\(project_id\)/,
  );
  assert.doesNotMatch(checkins, /drop index/i);
});

test("E38 preserves Project Check-in owner/project authorization with initplan-safe auth", () => {
  for (const policy of [
    "Owners read project check-ins",
    "Owners create check-ins for owned projects",
    "Owners delete project check-ins",
  ]) {
    assert.match(checkins, new RegExp(`create policy "${policy}"`));
  }
  assert.match(checkins, /\(select auth\.uid\(\)\) = user_id/);
  assert.match(checkins, /project\.id = project_check_ins\.project_id/);
  assert.match(checkins, /project\.user_id = \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(checkins, /project\.user_id = auth\.uid\(\)/);
});
