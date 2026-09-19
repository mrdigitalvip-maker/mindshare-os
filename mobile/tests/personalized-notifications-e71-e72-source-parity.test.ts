import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source=(path:string)=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),"utf8");

const migration=source("../../supabase/migrations/202609190225_e71_personalized_notification_preferences.sql");
const notificationService=source("../services/notification-service.ts");
const settings=source("../app/(app)/settings.tsx");
const reminders=source("../../supabase/functions/scheduled-reminders/index.ts");
const agentGuard=source("../../supabase/migrations/202609190240_e72_agent_notification_preference_guard.sql");

describe("E71/E72 personalized notification source parity",()=>{
  test("Android uses the same persisted domain preferences",()=>{
    for (const field of [
      "tasks_enabled","projects_enabled","studies_enabled","agents_enabled","journeys_enabled",
      "community_enabled","challenges_enabled","integrations_enabled","approvals_enabled","premium_enabled","daily_summary_enabled",
    ]) {
      expect(notificationService).toContain(field);
      expect(settings).toContain(field);
    }
    expect(notificationService).toContain('from("notification_preferences")');
    expect(notificationService).toContain("saveNotificationPreferences(userId, {})");
  });

  test("preferences preserve the server-owned delivery ledger",()=>{
    expect(migration).toContain("alter table public.notification_preferences");
    expect(migration).toContain(
      "revoke all privileges on table public.notification_deliveries from anon, authenticated",
    );
  });

  test("scheduler remains the single personalized reminder coordinator",()=>{
    expect(reminders).toContain('from("notification_deliveries").insert');
    expect(reminders).toContain('from("notifications").insert');
    expect(reminders).toContain("/functions/v1/push-send");
    expect(reminders).toContain("insideQuietHours");
    expect(reminders).toContain('action_plan_status", "pending_approval"');
  });

  test("Agent delivery respects the global Agent toggle at the server-owned ledger",()=>{
    expect(agentGuard).toContain("dedupe_key like 'agent-run:%'");
    expect(agentGuard).toContain("p.agents_enabled = false");
    expect(agentGuard).toContain("raise exception");
    expect(agentGuard).toContain("security invoker");
  });
});


describe("E72 Agent notification server guard",()=>{
  test("suppresses Agent delivery without changing Agent execution",()=>{
    const guard=source("../../supabase/migrations/202609190240_e72_notification_preference_guard.sql");
    expect(guard).toContain("notification_delivery_preference_guard");
    expect(guard).toContain("new.dedupe_key like 'agent-run:%'");
    expect(guard).toContain("p.agents_enabled = false");
  });
});
