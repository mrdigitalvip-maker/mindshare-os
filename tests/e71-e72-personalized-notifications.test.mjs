import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`, import.meta.url),"utf8");

const migration=read("supabase/migrations/202609190225_e71_personalized_notification_preferences.sql");
const pushService=read("src/services/push-service.ts");
const settings=read("src/components/settings-engagement.tsx");
const reminders=read("supabase/functions/scheduled-reminders/index.ts");
const scheduledAgents=read("supabase/functions/scheduled-agent-runs/index.ts");

test("E71 extends the existing notification preference row instead of creating a parallel system",()=>{
  for (const field of [
    "agents_enabled","journeys_enabled","community_enabled","integrations_enabled",
    "approvals_enabled","premium_enabled",
  ]) assert.match(migration,new RegExp(field));
  assert.match(migration,/alter table public\.notification_preferences/);
  assert.doesNotMatch(migration,/create table .*notification_preferences/i);
  assert.match(migration,/revoke all privileges on table public\.notification_deliveries\s+from anon, authenticated/);
});

test("E71 Web exposes all personalized domains through the existing PushService",()=>{
  for (const field of [
    "tasks_enabled","projects_enabled","studies_enabled","agents_enabled","journeys_enabled",
    "community_enabled","challenges_enabled","integrations_enabled","approvals_enabled","premium_enabled","daily_summary_enabled",
  ]) {
    assert.match(pushService,new RegExp(field));
    assert.match(settings,new RegExp(field));
  }
  assert.match(pushService,/\.from\("notification_preferences"\)/);
  assert.match(settings,/PushService\.save/);
});

test("E72 derives reminders from real KIVRYN state and preserves approval boundaries",()=>{
  for (const source of [
    "tasks","projects","study_goals","journey_missions","subscriptions","agent_runs",
    "creator_platform_connections",
  ]) assert.match(reminders,new RegExp(`\.from\\("${source}"\\)`));
  assert.match(reminders,/action_plan_status", "pending_approval"/);
  assert.match(reminders,/projects_enabled !== false/);
  assert.match(reminders,/integrations_enabled !== false/);
  assert.match(reminders,/pref\.tasks_enabled !== false && overdueTasks/);
  assert.match(reminders,/pref\.integrations_enabled !== false && connections\?\.length/);
  assert.match(reminders,/Nothing will execute without your approval/);
  assert.match(reminders,/Nada será executado sem sua aprovação/);
  assert.doesNotMatch(reminders,/executeAgent|agent-action-review|google-workspace-action/);
});

test("E72 reuses the existing dedupe, in-app and push pipeline",()=>{
  assert.match(reminders,/\.from\("notification_deliveries"\)\.insert/);
  assert.match(reminders,/\.from\("notifications"\)\.insert/);
  assert.match(reminders,/\/functions\/v1\/push-send/);
  assert.match(reminders,/insideQuietHours/);
  assert.match(reminders,/daily_summary_enabled === true/);
  assert.match(reminders,/community_enabled !== false/);
});

test("E72 scheduled Agent results honor the global Agent preference without altering execution",()=>{
  assert.match(scheduledAgents,/select\("agents_enabled,timezone,quiet_hours_start,quiet_hours_end"\)/);
  assert.match(scheduledAgents,/pref\?\.agents_enabled === false/);
  assert.match(scheduledAgents,/executeAgentRun/);
});
