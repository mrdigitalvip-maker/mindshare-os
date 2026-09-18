import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const agent = read("supabase/migrations/202609180012_e35_agentic_core_rls_indexes.sql");
const workspace = read("supabase/migrations/202609180013_e36_projects_tasks_rls_indexes.sql");

test("E35 covers the Agent owner FK without destructive index changes", () => {
  assert.match(agent, /create index if not exists agents_user_id_idx\s+on public\.agents\(user_id\)/);
  assert.doesNotMatch(agent, /drop index/i);
});

test("E35 keeps agents owner-only and initplan-safe", () => {
  assert.match(agent, /create policy agents_all[\s\S]*for all[\s\S]*to authenticated/);
  assert.match(agent, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(agent, /with check \(\(select auth\.uid\(\)\) = user_id\)/);
});

test("E35 consolidates agent_runs SELECT while preserving the prior authorization union", () => {
  const selectPolicies = agent.match(/on public\.agent_runs\s+for select/g) ?? [];
  assert.equal(selectPolicies.length, 1);
  assert.match(agent, /create policy "Owners read agent runs"/);
  assert.match(agent, /\(select auth\.uid\(\)\) = user_id[\s\S]*or exists/);
  assert.match(agent, /a\.user_id = \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(agent, /create policy runs_all/i);
});

test("E35 keeps agent_run writes behind owned-Agent checks", () => {
  for (const policy of [
    "Owners create agent runs",
    "Owners update agent runs",
    "Owners delete agent runs",
  ]) {
    assert.match(agent, new RegExp(`create policy "${policy}"`));
  }
  assert.match(agent, /for insert[\s\S]*a\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(agent, /for update[\s\S]*with check[\s\S]*a\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(agent, /for delete[\s\S]*a\.user_id = \(select auth\.uid\(\)\)/);
});

test("E36 adds only the advisor-backed Projects and Tasks FK indexes", () => {
  assert.match(workspace, /create index if not exists projects_user_id_idx\s+on public\.projects\(user_id\)/);
  assert.match(workspace, /create index if not exists tasks_project_id_idx\s+on public\.tasks\(project_id\)/);
  assert.doesNotMatch(workspace, /drop index/i);
});

test("E36 preserves Project owner CRUD with initplan-safe auth", () => {
  for (const policy of [
    "projects_select",
    "projects_insert",
    "projects_update",
    "projects_delete",
  ]) {
    assert.match(workspace, new RegExp(`create policy ${policy}`));
  }
  assert.match(workspace, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(workspace, /with check \(\(select auth\.uid\(\)\) = user_id\)/);
});

test("E36 preserves Task owner CRUD and owned-project linkage", () => {
  for (const policy of [
    "tasks_select",
    "tasks_insert",
    "tasks_update",
    "tasks_delete",
  ]) {
    assert.match(workspace, new RegExp(`create policy ${policy}`));
  }
  assert.match(workspace, /project_id is null[\s\S]*p\.id = tasks\.project_id[\s\S]*p\.user_id = \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(workspace, /p\.user_id = auth\.uid\(\)/);
});
