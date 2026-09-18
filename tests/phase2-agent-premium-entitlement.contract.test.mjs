import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const migration = read("supabase/migrations/202609180018_phase2_agent_premium_entitlement.sql");
const agents = read("src/routes/_shell.agents.tsx");
const workspace = read("src/routes/_shell.agents.$agentId.tsx");
const execution = read("supabase/functions/_shared/agent-execution.ts");
const schedule = read("supabase/migrations/20260915131500_agent_schedule_entitlement.sql");

test("Agent creation and reactivation are server-authoritative Premium operations", () => {
  assert.match(migration, /create or replace function public\.enforce_agent_premium_entitlement/);
  assert.match(migration, /if tg_op = 'INSERT'/);
  assert.match(migration, /coalesce\(new\.active, false\) = true/);
  assert.match(migration, /coalesce\(old\.active, false\) = false/);
  assert.match(migration, /public\.has_premium\(new\.user_id\)/);
  assert.match(migration, /public\.has_internal_full_access\(new\.user_id\)/);
  assert.match(migration, /message = 'premium_required'/);
  assert.match(migration, /before insert or update of active, user_id/);
  assert.doesNotMatch(migration, /delete from public\.agents/i);
});

test("Agent entitlement trigger is not directly executable by clients", () => {
  assert.match(
    migration,
    /revoke all on function public\.enforce_agent_premium_entitlement\(\)\s+from public, anon, authenticated/,
  );
});

test("Existing Agent run and schedule boundaries remain server-side Premium gated", () => {
  assert.match(execution, /admin\.rpc\("has_premium"/);
  assert.match(execution, /admin\.rpc\("has_internal_full_access"/);
  assert.match(execution, /premium_required/);
  assert.match(schedule, /public\.has_premium\(uid\) or public\.has_internal_full_access\(uid\)/);
  assert.match(schedule, /message = 'premium_required'/);
});

test("Agents list distinguishes entitlement loading, error, Free, and Premium", () => {
  assert.match(agents, /entitlementLoading/);
  assert.match(agents, /entitlementError/);
  assert.match(agents, /Verificando acesso Premium/);
  assert.match(agents, /Não foi possível verificar seu acesso Premium/);
  assert.match(agents, /subscription\.refetch\(\)/);
  assert.match(agents, /subscription\.data\?\.isPremium === true/);
});

test("Agent workspace does not mislabel entitlement lookup failures as Free", () => {
  assert.match(workspace, /entitlementLoading/);
  assert.match(workspace, /entitlementError/);
  assert.match(workspace, /Verificando acesso Premium/);
  assert.match(workspace, /Não foi possível verificar seu acesso Premium/);
  assert.match(workspace, /sub\.refetch\(\)/);
});
