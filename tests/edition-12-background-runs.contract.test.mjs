import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL(
  "../supabase/migrations/20260915134000_agent_background_runs.sql",
  import.meta.url,
);
const executionPath = new URL(
  "../supabase/functions/_shared/agent-execution.ts",
  import.meta.url,
);
const openaiRuntimePath = new URL(
  "../supabase/functions/_shared/kivryn-openai-agentic.ts",
  import.meta.url,
);
const workerPath = new URL(
  "../supabase/functions/scheduled-agent-runs/index.ts",
  import.meta.url,
);
const webServicePath = new URL("../src/services/background-run-service.ts", import.meta.url);
const mobileServicePath = new URL("../mobile/services/background-run-service.ts", import.meta.url);
const webAgentsPath = new URL("../src/routes/_shell.agents.tsx", import.meta.url);

test("Edition 12 separates schedule enqueueing from leased worker claims", async () => {
  const source = await readFile(migrationPath, "utf8");
  assert.match(source, /add column if not exists attempt_count integer not null default 0/);
  assert.match(source, /add column if not exists heartbeat_at timestamptz/);
  assert.match(source, /add column if not exists worker_claimed_at timestamptz/);
  assert.match(source, /add column if not exists retry_after timestamptz/);
  assert.match(source, /create or replace function public\.enqueue_due_agent_runs/);
  assert.match(source, /create or replace function public\.claim_background_agent_runs/);
  assert.match(source, /for update of r skip locked/);
  assert.match(source, /on conflict \(agent_id, scheduled_for\)/);
  assert.match(source, /attempt_count < 3/);
});

test("Edition 12 recovers stale workers and keeps the legacy claim path on the same lifecycle", async () => {
  const source = await readFile(migrationPath, "utf8");
  assert.match(source, /error_code = 'stale_worker'/);
  assert.match(source, /status = case when attempt_count >= 3 then 'failed' else 'retry_wait' end/);
  assert.match(source, /create or replace function public\.claim_due_agent_runs/);
  assert.match(source, /perform public\.enqueue_due_agent_runs/);
  assert.match(source, /from public\.claim_background_agent_runs/);
  assert.match(source, /grant execute on function public\.claim_background_agent_runs\(integer, interval\) to service_role/);
  assert.doesNotMatch(source, /grant execute on function public\.claim_background_agent_runs\([^\n]*\) to authenticated/);
});

test("Edition 12 retries only transient background failures and bounds provider runtime", async () => {
  const [source, openaiRuntime] = await Promise.all([
    readFile(executionPath, "utf8"),
    readFile(openaiRuntimePath, "utf8"),
  ]);
  assert.match(source, /RETRYABLE_BACKGROUND_ERRORS/);
  assert.match(source, /MAX_BACKGROUND_ATTEMPTS = 3/);
  assert.match(source, /provider_rate_limited/);
  assert.match(source, /provider_unavailable/);
  assert.match(source, /provider_timeout/);
  assert.match(openaiRuntime, /OPENAI_AGENT_TIMEOUT_MS/);
  assert.match(source, /status: "retry_wait"/);
  assert.match(source, /retryScheduled/);
  assert.match(source, /context_scopes: personalContext\.scopes/);
});

test("Edition 12 worker does not notify a failure while a retry is scheduled", async () => {
  const source = await readFile(workerPath, "utf8");
  assert.match(source, /rpc\("enqueue_due_agent_runs"/);
  assert.match(source, /rpc\("claim_background_agent_runs"/);
  assert.match(source, /error instanceof AgentExecutionError && error\.retryScheduled/);
  assert.match(source, /retrying\+\+/);
  assert.match(source, /falhou após as tentativas permitidas/);
  assert.match(source, /enqueued: Number\(enqueued\) \|\| 0/);
});

test("Web and Android expose owner-scoped read-only background status", async () => {
  const [web, mobile] = await Promise.all([
    readFile(webServicePath, "utf8"),
    readFile(mobileServicePath, "utf8"),
  ]);
  for (const source of [web, mobile]) {
    assert.match(source, /\.from\("agent_runs"\)/);
    assert.match(source, /\.eq\("user_id", auth\.user\.id\)/);
    assert.match(source, /\.in\("trigger", \["scheduled", "system"\]\)/);
    assert.match(source, /attempt_count/);
    assert.match(source, /retry_after/);
    assert.doesNotMatch(source, /\.insert\(/);
    assert.doesNotMatch(source, /\.update\(/);
    assert.doesNotMatch(source, /\.delete\(/);
    assert.doesNotMatch(source, /\.rpc\(/);
  }
});

test("Web Agents surface background queue health without adding a new top-level route", async () => {
  const source = await readFile(webAgentsPath, "utf8");
  assert.match(source, /BackgroundRunService\.list\(\)/);
  assert.match(source, /refetchInterval: 30_000/);
  assert.match(source, /label="Background"/);
  assert.match(source, /aguardando retry/);
});
