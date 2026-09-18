import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const e43 = read("supabase/migrations/202609180021_e43_studies_rls_indexes.sql");
const e44 = read("supabase/migrations/202609180022_e44_journeys_rls_indexes.sql");
const workspace = read("src/services/workspace-services.ts");
const journeys = read("src/services/parity-service.ts");

test("E43 keeps Studies authenticated owner CRUD and adds subject-leading FK indexes", () => {
  for (const table of ["study_subjects","study_sessions","study_goals","study_notes"]) {
    assert.match(e43, new RegExp(`create policy .*on public\\.${table}`, "s"));
  }
  for (const index of [
    "study_goals_subject_id_idx",
    "study_notes_subject_id_idx",
    "study_sessions_subject_id_idx",
  ]) {
    assert.match(e43, new RegExp(`create index if not exists ${index}`));
  }
  const allPolicies = e43.match(/for all\s+to authenticated/g) ?? [];
  assert.equal(allPolicies.length, 4);
  assert.match(e43, /\(select auth\.uid\(\)\) = user_id/);
  assert.doesNotMatch(e43, /to public/);
  assert.doesNotMatch(e43, /drop index/i);

  for (const table of ["study_subjects","study_sessions","study_goals","study_notes"]) {
    assert.match(workspace, new RegExp(`\\.from\\("${table}"\\)`));
  }
});

test("E44 keeps Journeys direct access SELECT-only and preserves canonical RPC mutations", () => {
  for (const index of [
    "journey_missions_journey_id_idx",
    "journey_pack_starts_journey_id_idx",
    "journey_pack_starts_pack_id_idx",
    "journey_pack_step_instances_source_step_id_idx",
  ]) {
    assert.match(e44, new RegExp(`create index if not exists ${index}`));
  }

  const selects = e44.match(/for select\s+to authenticated/g) ?? [];
  assert.equal(selects.length, 3);
  assert.doesNotMatch(e44, /for all/i);
  assert.doesNotMatch(e44, /for insert|for update|for delete/i);
  assert.match(e44, /user_id = \(select auth\.uid\(\)\)/);

  assert.match(journeys, /rpc\("ensure_daily_journey_mission"/);
  assert.match(journeys, /rpc\("complete_journey_action"/);
  assert.match(journeys, /rpc\("start_journey_pack"/);
});

test("E43/E44 do not introduce privileged helpers or destructive index changes", () => {
  const combined = e43 + e44;
  assert.doesNotMatch(combined, /security definer/i);
  assert.doesNotMatch(combined, /grant .* anon/i);
  assert.doesNotMatch(combined, /drop index/i);
});
