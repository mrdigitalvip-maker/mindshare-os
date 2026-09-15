import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const openaiPath = new URL(
  "../supabase/functions/_shared/kivryn-openai-agentic.ts",
  import.meta.url,
);
const executorPath = new URL(
  "../supabase/functions/_shared/agent-execution.ts",
  import.meta.url,
);
const connectorsPath = new URL(
  "../supabase/functions/_shared/kivryn-agent-connectors.ts",
  import.meta.url,
);
const subagentsPath = new URL(
  "../supabase/functions/_shared/kivryn-subagents.ts",
  import.meta.url,
);
const reviewPath = new URL(
  "../supabase/functions/agent-action-review/index.ts",
  import.meta.url,
);
const workerPath = new URL(
  "../supabase/functions/scheduled-agent-runs/index.ts",
  import.meta.url,
);
const migrationPath = new URL(
  "../supabase/migrations/20260915150000_final_agentic_core.sql",
  import.meta.url,
);
const webRuntimePath = new URL("../src/services/agent-runtime-service.ts", import.meta.url);
const webRoutePath = new URL("../src/routes/_shell.agents.$agentId.tsx", import.meta.url);
const mobileRuntimePath = new URL("../mobile/services/agent-runtime-service.ts", import.meta.url);
const mobileRoutePath = new URL("../mobile/app/(app)/agents.tsx", import.meta.url);

test("final Agent executor uses OpenAI Responses function calling instead of direct Chat Completions", async () => {
  const [openai, executor] = await Promise.all([
    readFile(openaiPath, "utf8"),
    readFile(executorPath, "utf8"),
  ]);
  assert.match(openai, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.doesNotMatch(executor, /v1\/chat\/completions/);
  assert.match(openai, /parallel_tool_calls: false/);
  assert.match(openai, /strict: true/);
  assert.match(openai, /additionalProperties: false/);
  assert.doesNotMatch(openai, /type:\s*["']computer/);
});

test("OpenAI tools can only delegate bounded subagents or propose a KIVRYN plan", async () => {
  const source = await readFile(openaiPath, "utf8");
  assert.match(source, /kivryn_delegate_subagent/);
  assert.match(source, /kivryn_propose_workspace_plan/);
  assert.match(source, /MAX_TOOL_ROUNDS = 3/);
  assert.match(source, /MAX_DELEGATIONS = 2/);
  assert.match(source, /prepareAgenticCoreRun/);
  assert.match(source, /pending_user_approval/);
  assert.doesNotMatch(source, /apply_nexora_action/);
  assert.doesNotMatch(source, /\.from\(/);
});

test("connectors and subagents are KIVRYN-owned, bounded and non-mutating", async () => {
  const [connectors, subagents] = await Promise.all([
    readFile(connectorsPath, "utf8"),
    readFile(subagentsPath, "utf8"),
  ]);
  for (const id of ["workspace.tasks", "workspace.projects", "workspace.studies"])
    assert.match(connectors, new RegExp(id.replace(".", "\\.")));
  assert.match(connectors, /canMutate: false/);
  assert.match(connectors, /model cannot invent or activate one/);
  for (const id of ["editor.v1", "planner.v1", "analyst.v1", "tutor.v1", "operator.v1"])
    assert.match(subagents, new RegExp(id.replace(".", "\\.")));
  assert.match(subagents, /KIVRYN_MAX_SUBAGENTS_PER_RUN = 3/);
  assert.match(subagents, /canDelegate: false/);
  assert.match(subagents, /canMutate: false/);
});

test("explicit review is the only final bridge from stored plan to workspace mutation RPC", async () => {
  const source = await readFile(reviewPath, "utf8");
  assert.match(source, /run\.action_plan/);
  assert.match(source, /run\.action_plan_fingerprint/);
  assert.match(source, /prepareAgenticCoreRun/);
  assert.match(source, /approvedStepIds/);
  assert.match(source, /rpc\("apply_nexora_action"/);
  assert.match(source, /p_confirmed: true/);
  assert.match(source, /p_action: command\.action/);
  assert.doesNotMatch(source, /body\.action_plan/);
  assert.doesNotMatch(source, /body\.action/);
});

test("scheduled Agents may produce approvals but never auto-approve workspace changes", async () => {
  const source = await readFile(workerPath, "utf8");
  assert.match(source, /result\.approvalRequired/);
  assert.match(source, /preparou ações para aprovação/);
  assert.match(source, /Nenhuma alteração foi aplicada/);
  assert.doesNotMatch(source, /apply_nexora_action/);
  assert.doesNotMatch(source, /p_confirmed/);
});

test("final migration makes run state read-only to clients and meters Agent runs atomically", async () => {
  const source = await readFile(migrationPath, "utf8");
  assert.match(source, /connector_ids text\[\]/);
  assert.match(source, /subagent_ids text\[\]/);
  assert.match(source, /action_plan jsonb/);
  assert.match(source, /action_plan_fingerprint text/);
  assert.match(source, /create policy "Owners read agent runs"/);
  assert.match(source, /revoke insert, update, delete on public\.agent_runs from anon, authenticated/);
  assert.match(source, /create or replace function public\.claim_agent_run_usage/);
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /grant execute on function public\.claim_agent_run_usage[^;]+to service_role;/);
  assert.doesNotMatch(source, /grant execute on function public\.claim_agent_run_usage[^;]+to authenticated;/);
});

test("Agent executor enforces entitlement, daily budget and records runtime authority", async () => {
  const source = await readFile(executorPath, "utf8");
  assert.match(source, /has_premium/);
  assert.match(source, /has_internal_full_access/);
  assert.match(source, /claim_agent_run_usage/);
  assert.match(source, /PREMIUM_AGENT_DAILY_LIMIT/);
  assert.match(source, /resolveKivrynAgentConnectors/);
  assert.match(source, /resolveKivrynSubagents/);
  assert.match(source, /connector_ids: connectorIds/);
  assert.match(source, /subagent_ids: agentic\.delegatedSubagents/);
  assert.match(source, /action_plan_status: agentic\.approvalRequired \? "pending_approval" : "none"/);
  assert.match(source, /OPENAI THINKS\. KIVRYN DECIDES WHAT OPENAI CAN TOUCH\./);
});

test("Web and Android expose the same persisted approval boundary", async () => {
  const [webService, webRoute, mobileService, mobileRoute] = await Promise.all([
    readFile(webRuntimePath, "utf8"),
    readFile(webRoutePath, "utf8"),
    readFile(mobileRuntimePath, "utf8"),
    readFile(mobileRoutePath, "utf8"),
  ]);
  for (const service of [webService, mobileService]) {
    assert.match(service, /agent-action-review/);
    assert.match(service, /action_plan_fingerprint/);
    assert.match(service, /pending_approval/);
  }
  assert.match(webRoute, /Plano proposto — aguardando sua aprovação/);
  assert.match(webRoute, /Aprovar ações restantes/);
  assert.match(webRoute, /Rejeitar plano/);
  assert.match(mobileRoute, /Aprovações pendentes/);
  assert.match(mobileRoute, /Aprovar restantes/);
  assert.match(mobileRoute, /Rejeitar/);
});
