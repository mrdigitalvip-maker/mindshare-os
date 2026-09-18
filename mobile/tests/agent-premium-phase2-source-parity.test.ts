import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const migration = source("../../supabase/migrations/202609180018_phase2_agent_premium_entitlement.sql");
const execution = source("../../supabase/functions/_shared/agent-execution.ts");
const schedule = source("../../supabase/migrations/20260915131500_agent_schedule_entitlement.sql");
const runtime = source("../services/agent-runtime-service.ts");
const subscription = source("../services/subscription-service.ts");

describe("Phase 2 Agent Premium authority parity", () => {
  test("shared database blocks Agent creation/reactivation without canonical entitlement", () => {
    expect(migration).toContain("enforce_agent_premium_entitlement");
    expect(migration).toContain("public.has_premium(new.user_id)");
    expect(migration).toContain("public.has_internal_full_access(new.user_id)");
    expect(migration).toContain("premium_required");
    expect(migration).toContain("before insert or update of active, user_id");
    expect(migration.toLowerCase()).not.toContain("delete from public.agents");
  });

  test("mobile continues to rely on canonical subscription runtime", () => {
    expect(subscription).toContain('rpc("get_subscription_runtime"');
    expect(subscription).toContain("runtime.is_premium === true");
  });

  test("manual and scheduled Agent execution remain server-authoritative", () => {
    expect(runtime).toContain('"agent-run"');
    expect(execution).toContain('admin.rpc("has_premium"');
    expect(execution).toContain('admin.rpc("has_internal_full_access"');
    expect(execution).toContain("premium_required");
    expect(schedule).toContain("public.has_premium(uid) or public.has_internal_full_access(uid)");
  });

  test("trigger helper cannot be invoked directly by authenticated clients", () => {
    expect(migration).toContain("from public, anon, authenticated");
  });
});
