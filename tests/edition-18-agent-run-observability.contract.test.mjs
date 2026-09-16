import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("E18 keeps Agent history observable across run and action lifecycle", async () => {
  const route = await read("src/routes/_shell.agents.$agentId.tsx");
  assert.match(route, /Trilha de ações/);
  assert.match(route, /Execuções do Agent/);
  assert.match(route, /action_plan_status/);
  assert.match(route, /subagent_ids/);
  assert.match(route, /r\.error_code \|\| "Execução em andamento"/);
  assert.match(route, /trigger === "scheduled" \? "Programado" : "Manual"/);
});

test("E18 preserves retry/heartbeat observability in the shared executor", async () => {
  const executor = await read("supabase/functions/_shared/agent-execution.ts");
  assert.match(executor, /retry_wait/);
  assert.match(executor, /retry_after/);
  assert.match(executor, /heartbeat_at/);
  assert.match(executor, /worker_claimed_at/);
  assert.match(executor, /error_code/);
});
