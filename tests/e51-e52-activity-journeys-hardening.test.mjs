import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const e51 = read("supabase/migrations/202609180029_e51_activity_logs_rls.sql");
const e52 = read("supabase/migrations/202609180030_e52_journeys_residual_rls_indexes.sql");
const parity = read("src/services/parity-service.ts");

test("E51 preserves Activity Logs exact SELECT + INSERT owner surface", () => {
  assert.match(e51, /create policy activity_select[\s\S]*for select\s+to public/);
  assert.match(e51, /create policy activity_insert[\s\S]*for insert\s+to public/);
  assert.doesNotMatch(e51, /for update|for delete|for all/i);
  assert.match(e51, /\(select auth\.uid\(\)\) = user_id/);
});

test("E52 closes remaining Journey FK indexes and preserves owner policies", () => {
  assert.match(e52, /create index if not exists journeys_source_pack_id_idx\s+on public\.journeys\(source_pack_id\)/);
  assert.match(e52, /create index if not exists momentum_events_journey_id_idx\s+on public\.momentum_events\(journey_id\)/);

  assert.match(e52, /create policy "owners manage journeys"[\s\S]*for all\s+to authenticated/);
  assert.match(e52, /create policy "owners read momentum"[\s\S]*for select\s+to authenticated/);
  assert.match(e52, /user_id = \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(e52, /drop index/i);

  assert.match(parity, /\.from\("journeys"\)/);
  assert.match(parity, /\.from\("momentum_events"\)/);
});

test("E51/E52 do not add privileged helpers or new direct mutation surfaces", () => {
  const combined = e51 + e52;
  assert.doesNotMatch(combined, /security definer/i);
  assert.doesNotMatch(combined, /grant .* anon/i);
  assert.doesNotMatch(combined, /drop index/i);
});
