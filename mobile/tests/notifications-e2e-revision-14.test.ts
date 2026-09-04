import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  createNotificationResponseDedupe,
  normalizeNotificationPermission,
  normalizeProjectId,
} from "../lib/notification-contract.ts";
import { notificationRoute, normalizePushToken } from "../lib/notification-routing.ts";
import { notificationReadiness, testPushSucceeded } from "../lib/settings-state.ts";
const source = (path: string) => readFileSync(path, "utf8");
const service = source("services/notification-service.ts"),
  settings = source("app/(app)/settings.tsx"),
  routing = source("hooks/use-notification-routing.ts"),
  root = source("app/_layout.tsx"),
  edge = source("../supabase/functions/push-send/index.ts"),
  schema = source("../supabase/migrations/202608160003_native_push_devices.sql");
describe("NXR-033 notification lifecycle", () => {
  test("1 permission normalization", () => {
    expect(normalizeNotificationPermission({ granted: true })).toBe("granted");
    expect(normalizeNotificationPermission({ status: "undetermined", canAskAgain: true })).toBe(
      "undetermined",
    );
    expect(normalizeNotificationPermission({ status: "denied", canAskAgain: true })).toBe("denied");
  });
  test("2 denied activation cannot succeed", () => {
    expect(notificationReadiness("denied", false)).toBe("denied");
    expect(service).toContain(
      'if (permission !== "granted") return { permission, registered: false }',
    );
  });
  test("3 blocked stays distinct without launch prompt", () => {
    expect(normalizeNotificationPermission({ status: "denied", canAskAgain: false })).toBe(
      "blocked",
    );
    expect(settings).toContain('noticeState === "blocked"');
    expect(root).not.toContain("requestPermissionsAsync");
  });
  test("4 channel readiness required", () => {
    expect(notificationReadiness("granted", true, false, true)).toBe("channel-error");
    expect(
      service.indexOf(
        "await ensureAndroidChannel()",
        service.indexOf("registerNativeNotifications"),
      ),
    ).toBeLessThan(service.indexOf("getExpoPushTokenAsync"));
  });
  test("5 local test is local-only", () => {
    expect(settings).toContain("notificação local, sem verificar a entrega por servidor");
    expect(service).toContain("notificações locais estão funcionando");
  });
  test("6 missing project ID blocks remote", () => {
    expect(normalizeProjectId(undefined)).toBeNull();
    expect(normalizeProjectId("placeholder")).toBeNull();
    expect(notificationReadiness("granted", false, true, false)).toBe("project-config");
  });
  test("7 token validation fails closed", () => {
    expect(normalizePushToken("")).toBeNull();
    expect(normalizePushToken("secret")).toBeNull();
    expect(normalizePushToken("ExpoPushToken[abc_123]")).toBe("ExpoPushToken[abc_123]");
  });
  test("8 backend confirmation required", () => {
    expect(service).toContain("await isCurrentDeviceRegistered(userId)");
  });
  test("9 device upsert idempotent", () => {
    expect(service).toContain('onConflict: "user_id,provider,device_id"');
    expect(schema).toContain("unique (user_id, provider, device_id)");
  });
  test("10 disabled device not ready or targeted", () => {
    expect(service).toContain('.eq("enabled", true)');
    expect(edge).toContain('.eq("enabled", true)');
  });
  test("11 malformed route falls back", () => {
    expect(notificationRoute({ kind: "task", resourceId: "../admin" })).toBe("/dashboard");
    expect(notificationRoute({ url: "/projects/x" })).toBe("/dashboard");
  });
  test("12 task route canonical", () =>
    expect(notificationRoute({ kind: "task", resourceId: "task-1" })).toBe("/tasks/task-1"));
  test("13 resource routes canonical", () => {
    expect(notificationRoute({ kind: "project", resourceId: "p-1" })).toBe("/projects/p-1");
    expect(notificationRoute({ kind: "study", resourceId: "s-1" })).toBe("/studies/s-1");
    expect(notificationRoute({ kind: "journey", resourceId: "j-1" })).toBe("/journeys/j-1");
  });
  test("14 duplicate response once", () => {
    const accept = createNotificationResponseDedupe();
    expect(accept("r1")).toBeTrue();
    expect(accept("r1")).toBeFalse();
  });
  test("15 cold start/listener dedupe and clear", () => {
    expect(routing).toContain("shouldHandleNotificationResponse");
    expect(routing).toContain("clearLastNotificationResponseAsync");
  });
  test("16 provider acceptance not physical delivery", () => {
    expect(testPushSucceeded({ accepted: 1, failed: 0 })).toBeTrue();
    expect(settings).toContain("Confirme o recebimento neste aparelho");
    expect(settings).not.toContain("Notificação recebida");
  });
  test("17 provider secrets stay server-side", () => {
    expect(edge).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(edge).not.toMatch(/jsonResponse\([^\n]*(privateKey|token_or_endpoint)/);
  });
  test("18 past reminder checked before permission", () => {
    const start = service.indexOf("scheduleTaskReminder");
    expect(service.indexOf("const date = new Date(reminderAt)", start)).toBeLessThan(
      service.indexOf("const permission = await notificationPermission()", start),
    );
  });
  test("19 reminder is singular and task-bound", () => {
    expect(service).toContain("await cancelTaskReminder(task.id)");
    expect(service).toContain('data: { kind: "task", resourceId: task.id }');
  });
  test("20 auth protects deferred routing", () => {
    expect(root.indexOf("<AuthProvider>")).toBeLessThan(
      root.indexOf("<NotificationRoutingGate />"),
    );
    expect(routing).toContain('statusRef.current === "initializing"');
    expect(routing).toContain('status === "unauthenticated"');
  });
});
