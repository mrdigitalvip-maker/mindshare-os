import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [migration, services, tabs, studiesWorkspace] = await Promise.all([
  readFile(new URL("../supabase/migrations/20260916123000_workspace_owner_integrity.sql", import.meta.url), "utf8"),
  readFile(new URL("../src/services/workspace-services.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/components/ui/tabs.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/routes/_shell.studies.$subjectId.tsx", import.meta.url), "utf8"),
]);

test("Projects and Tasks keep ownership after updates", () => {
  assert.match(migration, /create policy projects_update[\s\S]*using \(auth\.uid\(\) = user_id\)[\s\S]*with check \(auth\.uid\(\) = user_id\)/i);
  assert.match(migration, /create policy tasks_update[\s\S]*using \(auth\.uid\(\) = user_id\)[\s\S]*with check/i);
  assert.match(migration, /p\.user_id = auth\.uid\(\)/);
  assert.match(migration, /to authenticated/i);
});

test("Task completion state is synchronized centrally", () => {
  assert.match(migration, /create or replace function public\.sync_task_completion_state/);
  assert.match(migration, /before insert or update of completed, execution_status on public\.tasks/i);
  assert.match(migration, /new\.execution_status := case when new\.completed then 'completed' else 'not_started' end/);
  assert.match(migration, /new\.completed := \(new\.execution_status = 'completed'\)/);
});

test("workspace services scope Project and Task mutations to the authenticated user", () => {
  assert.match(services, /export const ProjectService/);
  assert.match(services, /export const ProductivityService/);
  assert.match(services, /export const TaskService = ProductivityService/);
  assert.match(services, /\.from\("projects"\)[\s\S]*\.eq\("user_id", userId\)/);
  assert.match(services, /\.from\("tasks"\)[\s\S]*\.eq\("user_id", userId\)/);
});

test("Studies persist subjects and sessions through user-scoped services", () => {
  assert.match(services, /export const StudyService/);
  assert.match(services, /\.from\("study_subjects"\)/);
  assert.match(services, /\.from\("study_sessions"\)/);
  assert.match(services, /\.from\("study_notes"\)/);
  assert.match(services, /\.from\("study_goals"\)/);
  assert.match(services, /user_id: userId/);
});

test("Studies overview can navigate to the session recorder", () => {
  assert.match(tabs, /data-value=\{value\}/);
  assert.match(studiesWorkspace, /\[data-value=sessions\]/);
  assert.match(studiesWorkspace, /Iniciar registro/);
  assert.match(studiesWorkspace, /Registrar sessão/);
  assert.match(studiesWorkspace, /Concluir sessão/);
});
