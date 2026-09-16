import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [registry, approval, review, auditHelper, migration, service, route] = await Promise.all([
  readFile(new URL("../supabase/functions/_shared/kivryn-action-registry.ts", import.meta.url), "utf8"),
  readFile(new URL("../supabase/functions/_shared/kivryn-action-approval.ts", import.meta.url), "utf8"),
  readFile(new URL("../supabase/functions/agent-action-review/index.ts", import.meta.url), "utf8"),
  readFile(new URL("../supabase/functions/_shared/kivryn-action-audit.ts", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20260916165000_agent_action_audit_trail.sql", import.meta.url), "utf8"),
  readFile(new URL("../src/services/agent-runtime-service.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/routes/_shell.agents.$agentId.tsx", import.meta.url), "utf8"),
]);

test("Edition 9 keeps every registered workspace mutation behind explicit approval", () => {
  assert.match(registry, /risk:\s*"mutation",\s*requiresApproval:\s*true/);
  assert.doesNotMatch(registry, /risk:\s*"mutation",\s*requiresApproval:\s*false/);
  assert.match(approval, /planFingerprint/);
  assert.match(review, /p_confirmed:\s*true/);
  assert.match(review, /apply_nexora_action/);
  assert.match(review, /filter\(\(id\) => !alreadyApplied\.has\(id\)\)/);
});

test("Edition 10 persists append-only action decisions without action payloads", () => {
  assert.match(migration, /create table if not exists public\.agent_action_audit_events/);
  assert.match(migration, /approval_required/);
  assert.match(migration, /approved/);
  assert.match(migration, /applied/);
  assert.match(migration, /rejected/);
  assert.match(migration, /failed/);
  assert.match(migration, /unique \(run_id, step_id, status\)/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /grant select on public\.agent_action_audit_events to authenticated/);
  assert.doesNotMatch(migration, /grant (insert|update|delete).*authenticated/i);
  assert.doesNotMatch(migration, /\bpayload\s+jsonb\b/i);
});

test("Agent review records approval, application, rejection and failure states", () => {
  assert.match(auditHelper, /"approval_required"/);
  assert.match(auditHelper, /"approved"/);
  assert.match(auditHelper, /"applied"/);
  assert.match(auditHelper, /"rejected"/);
  assert.match(auditHelper, /"failed"/);
  assert.match(review, /agent_action_audit_events/);
  assert.match(review, /status:\s*"approved"/);
  assert.match(review, /status:\s*"rejected"/);
  assert.match(review, /status:\s*"failed"/);
  assert.match(review, /status:\s*"applied"/);
  assert.match(review, /audit_persistence_error/);
});

test("Agent History exposes the read-only action audit trail", () => {
  assert.match(service, /async listAudit/);
  assert.match(service, /from\("agent_action_audit_events"\)/);
  assert.match(route, /Trilha de ações/);
  assert.match(route, /Aguardando aprovação/);
  assert.match(route, /Aprovada/);
  assert.match(route, /Aplicada/);
  assert.match(route, /Rejeitada/);
  assert.match(route, /Falhou/);
});
