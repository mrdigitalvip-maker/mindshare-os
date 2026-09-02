import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolveAppDestination, resolveAuthStatus } from "../lib/auth-state";
import { claimAuthCallback, parseAuthLink, safeAuthDestination } from "../lib/auth-callback";
import { isPremiumEntitlement } from "../lib/subscription";

const source = (path: string) => readFileSync(path, "utf8");

describe("Revision 12 account lifecycle", () => {
  test("restoration, refresh and invalid-session states remain explicit", () => {
    expect(resolveAuthStatus(false, false)).toBe("initializing");
    expect(resolveAuthStatus(true, true)).toBe("authenticated");
    expect(resolveAuthStatus(true, false)).toBe("unauthenticated");
    const provider = source("providers/auth-provider.tsx");
    expect(provider).toContain("getSession()");
    expect(provider).toContain("refreshSession(restored)");
    expect(provider).toContain("authRevision");
  });
  test("same-user refresh is neutral while identity changes clear cache first", () => {
    const provider = source("providers/auth-provider.tsx");
    expect(provider).toContain("activeUserId.current !== nextUserId");
    expect(provider.indexOf("queryClient.clear();", provider.indexOf("onAuthStateChange"))).toBeLessThan(provider.indexOf("setSession(nextSession)"));
  });
  test("routing protects private screens and preserves profile error recovery", () => {
    expect(resolveAppDestination({ authStatus: "unauthenticated", onboarding: "loading" })).toBe("/auth");
    expect(resolveAppDestination({ authStatus: "authenticated", onboarding: "incomplete" })).toBe("/onboarding");
    expect(resolveAppDestination({ authStatus: "authenticated", onboarding: "complete" })).toBe("/dashboard");
    expect(resolveAppDestination({ authStatus: "authenticated", onboarding: "error" })).toBeNull();
    expect(source("app/(app)/_layout.tsx")).toContain('return <Redirect href="/auth" />');
  });
  test("all account mutations use synchronous rapid-tap locks", () => {
    expect(source("features/auth/auth-screen.tsx")).toContain("submitLock.current");
    expect(source("app/onboarding/index.tsx")).toContain("submitLock.current");
    expect(source("app/auth/recovery.tsx")).toContain("submitLock.current");
    expect(source("app/auth/reset-password.tsx")).toContain("submitLock.current");
    expect(source("hooks/use-logout.ts")).toContain("logoutLock.current");
  });
  test("callbacks are malformed-safe, duplicate-safe and bounded", () => {
    expect(parseAuthLink("garbage").error).toBe("invalid_redirect");
    expect(parseAuthLink("nexora://auth/callback.evil?code=secret").error).toBe("invalid_redirect");
    const url = "nexora://auth/callback?code=one-time-r12";
    expect(claimAuthCallback(url)).toBe(true);
    expect(claimAuthCallback(url)).toBe(false);
    expect(safeAuthDestination("/auth/reset-password")).toBe("/auth/reset-password");
    expect(safeAuthDestination("/dashboard")).toBeNull();
    expect(safeAuthDestination("https://evil.example")).toBeNull();
  });
  test("callback credentials are never logged", () => {
    const authSources = [source("lib/auth-callback.ts"), source("lib/auth-links.ts"), source("app/auth/callback.tsx"), source("features/auth/auth-screen.tsx")].join("\n");
    expect(authSources).not.toMatch(/console\.(log|warn|error)/);
  });
  test("tester billing remains disabled without unsafe native dependency", () => {
    const pkg = JSON.parse(source("package.json"));
    expect(pkg.dependencies["react-native-iap"]).toBeUndefined();
    expect(source("lib/purchase-capabilities.ts")).toContain('"unavailable_for_tester_build"');
    expect(source("app/(app)/premium.tsx")).toContain("Assinaturas Premium estarão disponíveis em breve.");
  });
  test("subscription failure cannot invent Premium and backend owns free limits", () => {
    expect(isPremiumEntitlement("free")).toBe(false);
    expect(source("app/(app)/premium.tsx")).toContain("Não foi possível verificar seu plano.");
    expect(source("../supabase/migrations/202608260002_monetization.sql")).toContain("enforce_free_creation_limits");
    expect(source("../supabase/functions/ai-chat/index.ts")).toContain("claim_assistant_usage");
  });
});
