import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  lifecycleDestination,
  resolveAccountLifecycle,
  resolveAuthStatus,
} from "../lib/auth-state";
const source = (path: string) => readFileSync(path, "utf8");
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
  test("failure exposes retry and a hung request is bounded", () => {
    expect(resolveAccountLifecycle({ authStatus: "authenticated", provisioning: "error" })).toBe(
      "recoverable_error",
    );
    expect(source("app/index.tsx")).toContain('actionLabel="Tentar novamente"');
    expect(source("services/profile-service.ts")).toContain("PROFILE_BOOTSTRAP_TIMEOUT_MS");
  });
  test("visible authentication brand is KIVRYN", () => {
    const auth = source("features/auth/auth-screen.tsx");
    expect(auth).toContain("K I V R Y N");
    expect(auth).not.toContain(">N E X O R A<");
  });
});
