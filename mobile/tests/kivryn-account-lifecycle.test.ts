import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  lifecycleDestination,
  resolveAccountLifecycle,
  resolveAuthStatus,
} from "../lib/auth-state";
const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");
const migration = source("../supabase/migrations/202609110001_account_bootstrap.sql");

describe("KIVRYN-003 fresh account lifecycle", () => {
  test("auth hydration cannot navigate early", () => {
    const state = resolveAccountLifecycle({
      authStatus: resolveAuthStatus(false, false),
      provisioning: "idle",
    });
    expect(state).toBe("authenticating");
    expect(lifecycleDestination(state)).toBeNull();
  });
  test("new, missing and partially provisioned profiles use one bootstrap", () => {
    expect(resolveAccountLifecycle({ authStatus: "authenticated", provisioning: "pending" })).toBe(
      "provisioning",
    );
    expect(migration).toContain("after insert on auth.users");
    expect(source("services/profile-service.ts")).toContain(
      'supabase.rpc("bootstrap_authenticated_user"',
    );
  });
  test("repeated provisioning cannot duplicate profiles or fake user work", () => {
    expect(migration.match(/on conflict \(id\) do nothing/g)?.length).toBe(2);
    expect(migration).not.toMatch(/insert into public\.(tasks|study_subjects|projects|journeys)/);
  });
  test("incomplete onboarding routes only to onboarding", () => {
    const state = resolveAccountLifecycle({
      authStatus: "authenticated",
      provisioning: "success",
      onboarded: false,
    });
    expect(state).toBe("onboarding_required");
    expect(lifecycleDestination(state)).toBe("/onboarding");
  });
  test("completed onboarding, reopen, relogin and long-lived accounts are ready", () => {
    const state = resolveAccountLifecycle({
      authStatus: "authenticated",
      provisioning: "success",
      onboarded: true,
    });
    expect(state).toBe("ready");
    expect(lifecycleDestination(state)).toBe("/dashboard");
  });
  test("logout ignores stale profile state", () => {
    expect(
      resolveAccountLifecycle({
        authStatus: "unauthenticated",
        provisioning: "success",
        onboarded: true,
      }),
    ).toBe("unauthenticated");
  });
  test("failure exposes retry and every preparing-space path is bounded", () => {
    expect(resolveAccountLifecycle({ authStatus: "authenticated", provisioning: "error" })).toBe(
      "recoverable_error",
    );
    const profileHook = source("hooks/use-profile.ts");
    const callback = source("app/auth/callback.tsx");
    const root = source("app/index.tsx");
    expect(source("services/profile-service.ts")).toContain("PROFILE_BOOTSTRAP_TIMEOUT_MS");
    expect(profileHook).toContain("PROVISIONING_UI_TIMEOUT_MS = 18_000");
    expect(profileHook).toContain("setProvisioningTimedOut(true)");
    expect(callback).toContain("AUTH_CALLBACK_TIMEOUT_MS = 12_000");
    expect(callback).toContain("withTimeout(consumeAuthLink");
    expect(callback).toContain("setFailed(true)");
    expect(root).toContain("lifecycle.retry()");
  });
  test("fresh-account lifecycle copy supports Portuguese and English", () => {
    const root = source("app/index.tsx");
    const callback = source("app/auth/callback.tsx");
    expect(root).toContain('"pt-BR"');
    expect(root).toContain("Preparing your space");
    expect(callback).toContain('"pt-BR"');
    expect(callback).toContain("Back to sign in");
  });
  test("visible authentication brand is KIVRYN", () => {
    const auth = source("features/auth/auth-screen.tsx");
    expect(auth).toContain(">KIVRYN<");
    expect(auth).not.toContain(">N E X O R A<");
  });
});
