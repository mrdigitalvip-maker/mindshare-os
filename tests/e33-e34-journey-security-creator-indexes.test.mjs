import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const journey = read("supabase/migrations/202609180009_e33_journey_pack_rpc_security.sql");
const creator = read("supabase/migrations/202609180010_e34_creator_fk_indexes.sql");
const shell = read("src/routes/_shell.tsx");
const packs = read("src/routes/_shell.packs.tsx");
const packDetail = read("src/routes/_shell.packs.$slug.tsx");

test("E33 Journey Pack catalog is authenticated-shell only", () => {
  assert.match(shell, /!isAuthenticated/);
  assert.match(shell, /navigate\(\{ to: "\/auth"/);
  assert.match(packs, /listPacks/);
  assert.match(packDetail, /packDetail/);
});

test("E33 removes anon and SECURITY DEFINER exposure from Journey catalog RPCs", () => {
  assert.match(journey, /create or replace function public\.get_journey_packs\(\)/);
  assert.match(journey, /security invoker/);
  assert.match(journey, /create or replace function public\.get_journey_pack_detail\(p_slug text\)/);
  assert.match(journey, /revoke all on function public\.get_journey_packs\(\) from public, anon/);
  assert.match(journey, /revoke all on function public\.get_journey_pack_detail\(text\) from public, anon/);
  assert.match(journey, /grant execute on function public\.get_journey_packs\(\) to authenticated/);
  assert.doesNotMatch(journey, /security definer/i);
});

test("E33 also removes anonymous direct reads of Journey Pack tables", () => {
  assert.match(journey, /revoke select on table public\.journey_packs, public\.journey_pack_steps from anon/);
  assert.match(journey, /grant select on table public\.journey_packs, public\.journey_pack_steps to authenticated/);
});

test("E34 covers the Creator FK paths reported by the advisor without replacing existing indexes", () => {
  for (const index of [
    "creator_analytics_content_user_id_idx",
    "creator_analytics_snapshots_user_id_idx",
    "creator_country_observations_user_id_idx",
    "creator_clips_job_project_user_idx",
    "creator_clips_project_user_idx",
    "creator_clips_replaces_clip_id_idx",
  ]) {
    assert.match(creator, new RegExp(index));
  }
  assert.match(creator, /where replaces_clip_id is not null/);
  assert.doesNotMatch(creator, /drop index/i);
});
