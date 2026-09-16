import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [supabaseClient, authContext, authDestinations, shell, authPage, callback, recovery, root] =
  await Promise.all([
    readFile(new URL("../src/lib/supabase.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/auth-context.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/auth-destinations.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/_shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/auth.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/auth.callback.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/reset-password.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/__root.tsx", import.meta.url), "utf8"),
  ]);

test("Supabase Auth persists and refreshes PKCE sessions", () => {
  assert.match(supabaseClient, /persistSession:\s*true/);
  assert.match(supabaseClient, /autoRefreshToken:\s*true/);
  assert.match(supabaseClient, /detectSessionInUrl:\s*true/);
  assert.match(supabaseClient, /flowType:\s*["']pkce["']/);
});

test("AuthProvider hydrates session, observes identity changes, and clears user-scoped cache", () => {
  assert.match(authContext, /supabase\.auth\.onAuthStateChange/);
  assert.match(authContext, /supabase\.auth\.getSession\(\)/);
  assert.match(authContext, /queryClient\?\.cancelQueries\(\)\.then\(\(\) => queryClient\.clear\(\)\)/);
  assert.match(authContext, /event === ["']PASSWORD_RECOVERY["']/);
  assert.match(authContext, /supabase\.auth\.signInWithPassword/);
  assert.match(authContext, /supabase\.auth\.signInWithOAuth/);
  assert.match(authContext, /provider:\s*["']google["']/);
  assert.match(authContext, /supabase\.auth\.signOut\(\)/);
  assert.match(authContext, /supabase\.auth\.resetPasswordForEmail/);
  assert.match(authContext, /supabase\.auth\.updateUser\(\{ password: newPassword \}\)/);
});

test("production auth redirects use only the canonical KIVRYN origin", () => {
  assert.match(authDestinations, /CANONICAL_WEB_ORIGIN = ["']https:\/\/kivryn\.co["']/);
  assert.match(authDestinations, /oauth:\s*["']\/auth\/callback["']/);
  assert.match(authDestinations, /emailConfirmation:\s*["']\/confirm-email["']/);
  assert.match(authDestinations, /passwordRecovery:\s*["']\/reset-password["']/);
  assert.match(authContext, /webAuthDestination\(["']oauth["']/);
  assert.match(authContext, /webAuthDestination\(["']emailConfirmation["']/);
  assert.match(authContext, /webAuthDestination\(["']passwordRecovery["']/);
});

test("workspace shell gates protected content on authentication and onboarding", () => {
  assert.match(shell, /!authLoading && !isAuthenticated/);
  assert.match(shell, /navigate\(\{ to: ["']\/auth["'], search: \{ mode: ["']signin["'] \}, replace: true \}\)/);
  assert.match(shell, /const ready = !authLoading && isAuthenticated && !profileLoading && !!profile\?\.onboarded/);
  assert.match(shell, /if \(!ready\) return <FullPageLoader \/>/);
  assert.match(authPage, /!authLoading && isAuthenticated/);
  assert.match(authPage, /navigate\(\{ to: ["']\/dashboard["'], replace: true \}\)/);
});

test("OAuth callback exchanges PKCE code once and removes auth parameters", () => {
  assert.match(callback, /exchangeCodeOnce/);
  assert.match(callback, /supabase\.auth\.exchangeCodeForSession\(code\)/);
  assert.match(callback, /supabase\.auth\.getSession\(\)/);
  assert.match(callback, /clearOAuthParams\(url\)/);
  assert.match(callback, /window\.history\.replaceState/);
});

test("password reset is usable only inside a recovery session", () => {
  assert.match(recovery, /recoverySession/);
  assert.match(recovery, /setReady\(recoverySession\)/);
  assert.match(recovery, /setInvalidLink\(!recoverySession\)/);
  assert.match(recovery, /await updatePassword\(password\)/);
});

test("AuthProvider wraps the routed application", () => {
  assert.match(root, /<AuthProvider queryClient=\{queryClient\}>/);
  assert.match(root, /<Outlet \/>/);
});
