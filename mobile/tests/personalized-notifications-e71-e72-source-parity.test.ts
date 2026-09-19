import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source=(path:string)=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),"utf8");

const migration=source("../../supabase/migrations/202609190225_e71_personalized_notification_preferences.sql");
const notificationService=source("../services/notification-service.ts");
const settings=source("../app/(app)/settings.tsx");
const reminders=source("../../supabase/functions/scheduled-reminders/index.ts");
const scheduledAgents=source("../../supabase/functions/scheduled-agent-runs/index.ts");

describe("E71/E72 personalized notification source parity",()=>{
  test("Android uses the same persisted domain preferences",()=>{
    for (const field of [
      "tasks_enabled","projects_enabled","studies_enabled","agents_enabled","journeys_enabled",
      "community_enabled","integrations_enabled","approvals_enabled","premium_enabled","daily_summary_enabled",
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

  test("Agent delivery respects the global Agent toggle",()=>{
    expect(scheduledAgents).toContain(
      'select("agents_enabled,timezone,quiet_hours_start,quiet_hours_end")',
    );
    expect(scheduledAgents).toContain("pref?.agents_enabled === false");
  });
});
