import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const migration = read("supabase/migrations/20260915122000_agent_schedules.sql");
const cronMigration = read("supabase/migrations/20260915123500_schedule_agent_runs_cron.sql");
const sharedExecutor = read("supabase/functions/_shared/agent-execution.ts");
const manualRun = read("supabase/functions/agent-run/index.ts");
const scheduler = read("supabase/functions/scheduled-agent-runs/index.ts");
const pushSend = read("supabase/functions/push-send/index.ts");
const webService = read("src/services/agent-schedule-service.ts");
const webAgent = read("src/routes/_shell.agents.$agentId.tsx");
const mobileService = read("mobile/services/agent-schedule-service.ts");
const mobileAgents = read("mobile/app/(app)/agents.tsx");
const mobileMore = read("mobile/app/(app)/(tabs)/more.tsx");
const mobileLayout = read("mobile/app/(app)/_layout.tsx");
const notificationRouting = read("mobile/lib/notification-routing.ts");

test("scheduled Agents schema is owner-scoped and idempotent", () => {
  assert.match(migration, /configure_agent_schedule/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /agent_runs_scheduled_occurrence_unique/);
  assert.match(migration, /pg_try_advisory_xact_lock/);
  assert.match(migration, /claim_due_agent_runs/);
  assert.match(migration, /grant execute on function public\.claim_due_agent_runs\(integer\) to service_role/);
  assert.match(migration, /schedule_frequency in \('daily', 'weekly'\)/);
});

test("one global server scheduler drives background Agent runs", () => {
  assert.match(cronMigration, /kivryn-scheduled-agent-runs/);
  assert.match(cronMigration, /\/functions\/v1\/scheduled-agent-runs/);
  assert.match(cronMigration, /kivryn_scheduler_secret/);
  assert.match(scheduler, /x-scheduler-secret/);
  assert.match(scheduler, /claim_due_agent_runs/);
  assert.match(scheduler, /executeAgentRun/);
  assert.match(scheduler, /notification_deliveries/);
  assert.match(scheduler, /\/functions\/v1\/push-send/);
});

test("manual and scheduled runs reuse the same guarded executor", () => {
  assert.match(manualRun, /executeAgentRun/);
  assert.match(sharedExecutor, /subscriptions/);
  assert.match(sharedExecutor, /premium_required/);
  assert.match(sharedExecutor, /\.eq\("user_id", userId\)/);
  assert.match(sharedExecutor, /OPENAI_API_KEY/);
  assert.match(sharedExecutor, /invalid_run_claim/);
  assert.doesNotMatch(sharedExecutor, /SERVICE_ROLE_KEY/);
});

test("web manages real schedules through the owner-scoped RPC", () => {
  assert.match(webService, /configure_agent_schedule/);
  assert.match(webService, /clear_agent_schedule/);
  assert.match(webAgent, /TabsTrigger value="schedule"/);
  assert.match(webAgent, /AgentScheduleService\.configure/);
  assert.match(webAgent, /Próxima execução/);
});

test("Android exposes the same schedule backend without adding a top-level tab", () => {
  assert.match(mobileService, /configure_agent_schedule/);
  assert.match(mobileService, /clear_agent_schedule/);
  assert.match(mobileAgents, /Briefings programados/);
  assert.match(mobileMore, /href="\/agents"/);
  assert.match(mobileLayout, /name="agents" options=\{\{ headerShown: false \}\}/);
});

test("Agent completion notification routes safely on web and Android", () => {
  assert.match(pushSend, /const agent = path\.match/);
  assert.match(pushSend, /kind: "agent"/);
  assert.match(pushSend, /jsonResponse\(request,/);
  assert.match(notificationRouting, /payload\.kind === "agent"/);
  assert.match(notificationRouting, /return "\/agents"/);
});
