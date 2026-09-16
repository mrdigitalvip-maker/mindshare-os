import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("E16 keeps authoritative time in the shared manual/scheduled executor", async () => {
  const source = await read("supabase/functions/_shared/agent-execution.ts");
  assert.match(source, /schedule_timezone/);
  assert.match(source, /Authoritative execution timestamp \(UTC\)/);
  assert.match(source, /Authoritative local execution date\/time/);
  assert.match(source, /Never infer those values from model knowledge/);
});

test("E16 only falls back to an explicitly configured model on transient provider failures", async () => {
  const source = await read("supabase/functions/_shared/agent-execution.ts");
  assert.match(source, /OPENAI_AGENT_FALLBACK_MODEL/);
  assert.match(source, /MODEL_FALLBACK_ERRORS/);
  assert.match(source, /provider_rate_limited/);
  assert.match(source, /provider_unavailable/);
  assert.match(source, /provider_timeout/);
  assert.doesNotMatch(
    source.match(/const MODEL_FALLBACK_ERRORS = new Set\([\s\S]*?\);/)?.[0] ?? "",
    /provider_error/,
    "generic provider/client errors must not silently switch models",
  );
});

test("E16 preserves the proposal-only mutation boundary during fallback", async () => {
  const [executor, agentic] = await Promise.all([
    read("supabase/functions/_shared/agent-execution.ts"),
    read("supabase/functions/_shared/kivryn-openai-agentic.ts"),
  ]);
  assert.match(executor, /OPENAI THINKS\. KIVRYN DECIDES WHAT OPENAI CAN TOUCH\./);
  assert.match(agentic, /This NEVER executes actions/);
  assert.match(agentic, /pending_user_approval/);
  assert.match(agentic, /No workspace mutation was executed/);
});
