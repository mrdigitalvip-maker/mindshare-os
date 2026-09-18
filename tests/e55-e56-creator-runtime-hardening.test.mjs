import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const creator=read("supabase/migrations/202609180033_e55_creator_residual_rls_indexes.sql");
const runtime=read("supabase/migrations/202609180034_e56_ai_action_runtime_rls_index.sql");

test("E55 preserves Creator authenticated owner policies",()=>{
  for(const name of [
    "creator_content_log_owner_all","creator_goals_owner_all","creator_jobs_owner_select",
    "creator_learning_owner_all","creator_manual_country_owner_all","creator_manual_metrics_owner_all",
    "creator_strategies_owner_all","creator_usage_owner_select",
  ]) assert.ok(creator.includes("create policy "+name));
  const executable=creator.replace(/^--.*$/gm,"").replaceAll("(select auth.uid())","");
  assert.doesNotMatch(executable,/auth\.uid\(\)/);
  assert.doesNotMatch(creator,/to public/);
});

test("E55 adds the five remaining Creator FK indexes without drops",()=>{
  for(const name of [
    "creator_goals_user_id_idx",
    "creator_jobs_project_id_user_id_idx",
    "creator_manual_country_observations_user_id_idx",
    "creator_manual_metric_snapshots_content_id_idx",
    "creator_oauth_states_user_id_idx",
  ]) assert.ok(creator.includes("create index if not exists "+name));
  assert.doesNotMatch(creator,/drop index/i);
});

test("E56 preserves AI usage CRUD plus action/challenge/runtime operation surfaces",()=>{
  for(const policy of [
    'create policy "owner select"',
    'create policy "owner insert"',
    'create policy "owner update"',
    'create policy "owner delete"',
    'create policy "Owners read action history"',
    'create policy personal_challenges_owner_select',
    'create policy personal_challenge_events_owner_select',
    'create policy "Users insert own runtime errors"',
  ]) assert.ok(runtime.includes(policy));
  assert.ok(runtime.includes("to public"));
  const executable=runtime.replace(/^--.*$/gm,"").replaceAll("(select auth.uid())","");
  assert.doesNotMatch(executable,/auth\.uid\(\)/);
});

test("E56 adds action history conversation index and no destructive index changes",()=>{
  assert.ok(runtime.includes("create index if not exists nexora_action_runs_conversation_id_idx"));
  assert.doesNotMatch(runtime,/drop index/i);
});
