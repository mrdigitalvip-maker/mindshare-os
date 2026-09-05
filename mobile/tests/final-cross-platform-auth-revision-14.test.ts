import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("NXR-036 cross-platform authentication", () => {
  test("native Google, confirmation and recovery use only the native callback", () => {
    const screen = read("mobile/features/auth/auth-screen.tsx");
    const recovery = read("mobile/app/auth/recovery.tsx");
    const links = read("mobile/lib/auth-links.ts");
    expect(links).toContain('authCallbackUrl = "nexora://auth/callback"');
    expect(links).toContain("passwordRecoveryUrl");
    expect(screen).toContain("emailRedirectTo: authCallbackUrl");
    expect(screen).toContain("redirectTo: authCallbackUrl");
    expect(recovery).toContain("redirectTo: passwordRecoveryUrl");
    expect(screen).not.toContain('/auth/callback"');
    expect(screen).toContain("supabase.auth.resend");
    expect(screen).toContain("resendCooldown");
    expect(screen).toContain("submitLock.current");
  });

  test("native callback is strict, PKCE-capable, once-only, and recovery typed", () => {
    const url = "nexora://auth/callback?code=nxr036&type=recovery&next=%2Fauth%2Freset-password";
    const parser = read("mobile/lib/auth-callback.ts");
    expect(url).toContain("type=recovery");
    expect(parser).toContain('parsed.protocol === "nexora:"');
    expect(parser).toContain("consumedCallbacks.has(fingerprint)");
    expect(parser).toContain('value === "/auth/reset-password"');
    expect(read("mobile/lib/auth-links.ts")).toContain("exchangeCodeForSession(code)");
  });

  test("cold/warm callback routing has no browser or ordinary-login recovery dependency", () => {
    const callback = read("mobile/app/auth/callback.tsx");
    expect(callback).toContain("useURL()");
    expect(callback).toContain('router.replace(profile.onboarded ? "/dashboard" : "/onboarding")');
    expect(callback).toContain('router.replace("/auth/reset-password")');
    expect(callback).toContain("isRecoveryLink || recoverySession");
    expect(read("mobile/lib/auth-callback.ts")).toContain('recovery: value("type") === "recovery"');
    expect(callback).not.toContain("window.location");
  });

  test("web destinations are fixed to browser origin and production demo fails closed", () => {
    const destinations = read("src/lib/auth-destinations.ts");
    const auth = read("src/lib/auth-context.tsx");
    const demo = read("src/lib/demo/config.ts");
    expect(destinations).toContain('oauth: "/auth/callback"');
    expect(destinations).toContain('emailConfirmation: "/confirm-email"');
    expect(destinations).toContain('passwordRecovery: "/reset-password"');
    expect(destinations).not.toContain("searchParams");
    expect(auth).toContain('webAuthDestination("oauth", window.location.origin)');
    expect(demo).toContain('import.meta.env.DEV && rawFlag === "true"');
  });

  test("credentials are not logged and identity lifecycle remains isolated", () => {
    const sources = [
      "mobile/lib/auth-links.ts",
      "mobile/lib/auth-callback.ts",
      "mobile/app/auth/callback.tsx",
    ]
      .map(read)
      .join("\n");
    expect(sources).not.toMatch(
      /console\.(log|info|warn|error).*?(accessToken|refreshToken|code)/s,
    );
    const nativeProvider = read("mobile/providers/auth-provider.tsx");
    expect(nativeProvider).toContain("activeUserId.current !== nextUserId");
    expect(nativeProvider).toContain('event === "PASSWORD_RECOVERY"');
    expect(nativeProvider).toContain("recoveryUserId.current ===");
    expect(nativeProvider).toContain("queryClient.clear()");
  });

  test("both clients resolve canonical profiles", () => {
    expect(read("mobile/services/profile-service.ts")).toContain('.from("profiles")');
    expect(read("src/services/profile-service.ts")).toContain('.from("profiles")');
    expect(read("src/routes/_shell.tsx")).toContain("profile?.full_name");
  });
});
