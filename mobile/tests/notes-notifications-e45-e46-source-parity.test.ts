import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const e45 = source("../../supabase/migrations/202609180023_e45_notes_rls_index.sql");
const e46 = source("../../supabase/migrations/202609180024_e46_notifications_preferences_rls.sql");
const mobileNotifications = source("../services/notification-service.ts");

describe("E45/E46 Notes and Notifications shared-backend parity", () => {
  test("Notes hardening stays owner-only and additive", () => {
    expect(e45).toContain("notes_user_id_idx");
    expect(e45).toContain("for all");
    expect(e45).toContain("to public");
    expect(e45).toContain("(select auth.uid())");
    expect(e45.toLowerCase()).not.toContain("drop index");
  });

  test("Notifications keep exact direct access while preferences stay authenticated-only", () => {
    expect(e46).toContain("notification_select");
    expect(e46).toContain("notification_insert");
    expect(e46).toContain("notification_update");
    expect(e46).not.toContain("notification_delete");
    expect(e46).toContain('create policy "owner select"');
    expect(e46).toContain('create policy "owner delete"');
    expect(e46).toContain("to authenticated");
  });

  test("Android keeps native Expo push flow and owner-scoped push_devices registration", () => {
    expect(mobileNotifications).toContain('from("push_devices")');
    expect(mobileNotifications).toContain('.eq("user_id", userId)');
    expect(mobileNotifications).toContain("getExpoPushTokenAsync");
    expect(mobileNotifications).toContain('"push-send"');
  });
});
