import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { claimAuthCallback, parseAuthLink, safeAuthDestination } from "../lib/auth-callback";
import {
  canNavigateNotification,
  resolveAppDestination,
  resolveAuthStatus,
} from "../lib/auth-state";

const source = (path: string) => readFileSync(path, "utf8");
const provider = source("providers/auth-provider.tsx");
const callback = source("app/auth/callback.tsx");
const logout = source("hooks/use-logout.ts");
const notificationRouting = source("hooks/use-notification-routing.ts");

describe("NXR-034 Android auth and session lifecycle", () => {
  test("1 valid-session cold start resolves into the app exactly once", () => {
    expect(
      resolveAppDestination({ authStatus: resolveAuthStatus(true, true), onboarding: "complete" }),
    ).toBe("/dashboard");
    expect(provider).toContain("restoreRevision === authRevision.current");
    expect(callback.indexOf("consumeAuthLink(incomingUrl)")).toBeLessThan(
      callback.indexOf("setLinkHandled(true)", callback.indexOf("consumeAuthLink(incomingUrl)")),
    );
  });

  test("2 no-session cold start resolves to auth", () => {
    expect(
      resolveAppDestination({ authStatus: resolveAuthStatus(true, false), onboarding: "loading" }),
    ).toBe("/auth");
  });

  test("3 hydration cannot expose a protected destination", () => {
    expect(
      resolveAppDestination({ authStatus: "initializing", onboarding: "complete" }),
    ).toBeNull();
    expect(source("app/(app)/_layout.tsx")).toContain('status === "initializing"');
  });

  test("4 logout clears account-owned query cache before sign out", () => {
    expect(logout.indexOf("queryClient.clear()")).toBeLessThan(
      logout.indexOf("supabase.auth.signOut()"),
    );
  });

  test("5 logout removes protected navigation history", () => {
    expect(logout).toContain("router.dismissAll()");
    expect(logout.indexOf("router.dismissAll()")).toBeLessThan(
      logout.indexOf('router.replace("/auth")'),
    );
  });

  test("6 identity transition clears User A cache before exposing User B", () => {
    const listener = provider.indexOf("onAuthStateChange");
    expect(provider.indexOf("queryClient.clear();", listener)).toBeLessThan(
      provider.indexOf("setSession(nextSession)", listener),
    );
  });

  test("7 same-user token refresh preserves application state", () => {
    expect(provider).toContain("activeUserId.current !== nextUserId");
    expect(provider).not.toContain('event === "TOKEN_REFRESHED" && queryClient.clear');
  });

  test("8 expired or invalid restoration fails closed", () => {
    expect(provider).toContain("refreshSession(restored)");
    expect(provider).toContain("setSession(null)");
  });

  test("9 recovery callback is identified and claimed once", () => {
    const url = "nexora://auth/callback?next=%2Fauth%2Freset-password&type=recovery&code=nxr034";
    expect(parseAuthLink(url).recovery).toBeTrue();
    expect(claimAuthCallback(url)).toBeTrue();
    expect(claimAuthCallback(url)).toBeFalse();
  });

  test("10 an ordinary callback cannot become password recovery", () => {
    expect(
      parseAuthLink("nexora://auth/callback?next=%2Fauth%2Freset-password&code=ordinary").recovery,
    ).toBeFalse();
    expect(callback).toContain("isRecoveryLink || recoverySession");
  });

  test("11 malformed and unrelated callbacks fail closed", () => {
    expect(parseAuthLink("https://example.com/auth/callback?code=secret").error).toBe(
      "invalid_redirect",
    );
    expect(parseAuthLink("nexora://auth/other?code=secret").error).toBe("invalid_redirect");
    expect(safeAuthDestination("/dashboard")).toBeNull();
  });

  test("12 duplicate callback processing is rejected", () => {
    expect(callback).toContain("if (!claimAuthCallback(incomingUrl))");
    expect(callback).toContain("setFailed(true)");
  });

  test("13 callback credentials are never logged", () => {
    const authCallbackSources = [
      source("lib/auth-callback.ts"),
      source("lib/auth-links.ts"),
      callback,
    ].join("\n");
    expect(authCallbackSources).not.toMatch(/console\.(log|info|warn|error)/);
  });

  test("14 rapid login taps share a synchronous lock", () => {
    const authScreen = source("features/auth/auth-screen.tsx");
    expect(authScreen).toContain("if (submitLock.current) return");
    expect(authScreen).toContain("submitLock.current = true");
  });

  test("15 rapid logout taps are idempotently ignored", () => {
    expect(logout).toContain("if (logoutLock.current) return");
  });

  test("16 notification tap during hydration remains deferred", () => {
    expect(canNavigateNotification("initializing")).toBeFalse();
    expect(notificationRouting).toContain('statusRef.current === "initializing"');
  });

  test("17 signed-out notification tap cannot bypass auth", () => {
    expect(canNavigateNotification("unauthenticated")).toBeFalse();
    expect(notificationRouting).toContain('status === "unauthenticated"');
  });

  test("18 NXR-033 route-once behavior remains installed", () => {
    expect(notificationRouting).toContain("shouldHandleNotificationResponse");
    expect(notificationRouting).toContain("clearLastNotificationResponseAsync");
  });

  test("19 NXR-027 canonical name remains profile-owned", () => {
    expect(source("services/profile-service.ts")).toContain("normalizeProfileIdentity");
    expect(source("lib/profile-identity.ts")).not.toContain('split("@")[0]');
  });

  test("20 push registration ownership remains isolated", () => {
    const notifications = source("services/notification-service.ts");
    expect(logout).toContain("disableCurrentPushDevice(session.user.id)");
    expect(notifications).toContain("currentOwner && currentOwner !== userId");
    expect(notifications).toContain("SecureStore.deleteItemAsync(DEVICE_OWNER_KEY)");
  });

  test("21 logout clears a deferred notification before session teardown", () => {
    expect(logout).toContain("clearPendingNotificationNavigation()");
    expect(logout.indexOf("clearPendingNotificationNavigation()")).toBeLessThan(
      logout.indexOf("supabase.auth.signOut()"),
    );
  });
});
