import assert from "node:assert/strict";
import test from "node:test";

import { resolveAppDestination, resolveAuthStatus } from "../lib/auth-state.ts";
import { resolveCapabilityTier } from "../lib/capabilities.ts";
import { normalizePushToken, notificationRoute } from "../lib/notification-routing.ts";
import { normalizeAmplitude, normalizeNexoraState } from "../lib/nexora-state.ts";
import {
  queryKeys,
  taskMutationInvalidations,
  verifiedExecutionInvalidations,
} from "../lib/query-keys.ts";
import { normalizeEntitlement } from "../lib/subscription.ts";
import { presentAuthError } from "../lib/auth-errors.ts";
import {
  initialProfileValues,
  normalizeProfileIdentity,
  providerIdentity,
} from "../lib/profile-identity.ts";
import { parseAuthLink } from "../lib/auth-callback.ts";

test("auth resolution is explicit and profile errors do not redirect", () => {
  assert.equal(resolveAuthStatus(false, false), "initializing");
  assert.equal(resolveAuthStatus(true, true), "authenticated");
  assert.equal(resolveAppDestination({ authStatus: "authenticated", onboarding: "error" }), null);
});
test("resource query keys reject empty IDs", () => {
  assert.deepEqual(queryKeys.project("abc"), ["projects", "abc"]);
  assert.throws(() => queryKeys.project(""));
  assert.deepEqual(queryKeys.studySubject("subject-1"), ["study-subjects", "subject-1"]);
  assert.throws(() => queryKeys.studySubject(" "));
});
test("task mutations invalidate global and owning project data", () => {
  assert.deepEqual(taskMutationInvalidations("project-1"), [
    ["tasks"],
    ["projects"],
    ["projects", "project-1"],
    ["tasks", "project", "project-1"],
  ]);
});
test("verified execution refreshes every dependent read model with targeted keys", () => {
  assert.deepEqual(verifiedExecutionInvalidations, [
    ["tasks"],
    ["study-subjects"],
    ["study-overview"],
    ["journeys"],
    ["journeys", "momentum"],
    ["journeys", "challenge"],
    ["arena"],
    ["community"],
  ]);
});
test("capabilities and subscriptions default conservatively", () => {
  assert.equal(resolveCapabilityTier("pro", "active"), "NEXORA ADVANCED");
  assert.equal(resolveCapabilityTier(undefined, "active"), "NEXORA BASIC");
  assert.equal(normalizeEntitlement("past_due"), "expired");
  assert.equal(normalizeEntitlement(undefined), "free");
});
test("push token and notification routes reject malformed data", () => {
  assert.equal(normalizePushToken("ExponentPushToken[abc_123]"), "ExponentPushToken[abc_123]");
  assert.equal(normalizePushToken("secret"), null);
  assert.equal(
    notificationRoute({ kind: "project", resourceId: "project-1" }),
    "/projects/project-1",
  );
  assert.equal(notificationRoute({ kind: "task", resourceId: "task-1" }), "/tasks/task-1");
  assert.equal(notificationRoute({ kind: "study", resourceId: "../bad" }), "/dashboard");
});
test("NEXORA visual inputs are guarded", () => {
  assert.equal(normalizeNexoraState("unknown"), "idle");
  assert.equal(normalizeAmplitude(Number.NaN), 0);
  assert.equal(normalizeAmplitude(2), 1);
  assert.equal(normalizeAmplitude(-1), 0);
});
test("auth errors are normalized without exposing backend messages", () => {
  assert.equal(
    presentAuthError(new Error("Invalid login credentials")).category,
    "INVALID_CREDENTIALS",
  );
  assert.equal(presentAuthError(new Error("Failed to fetch")).category, "NETWORK");
  assert.equal(
    presentAuthError(new Error("internal database detail")).message,
    "Não foi possível concluir. Tente novamente.",
  );
});
test("provider identity supports Google metadata fallbacks", () => {
  const user = {
    id: "u1",
    email: "ana@example.com",
    app_metadata: { provider: "google" },
    user_metadata: { name: "Ana Silva", picture: "https://example.com/a.jpg" },
  } as never;
  assert.deepEqual(providerIdentity(user), {
    name: "Ana Silva",
    avatarUrl: "https://example.com/a.jpg",
    provider: "google",
  });
  assert.equal(initialProfileValues(user).onboarded, false);
  const identity = normalizeProfileIdentity(user, {
    id: "u1",
    fullName: "Nome personalizado",
    avatarUrl: null,
    onboarded: true,
  });
  assert.equal(identity.displayName, "Nome personalizado");
  assert.equal(identity.avatarUrl, "https://example.com/a.jpg");
});
test("auth callbacks accept only the native callback and parse code or hash tokens", () => {
  assert.equal(
    parseAuthLink("https://evil.example/auth/callback?code=x").error,
    "invalid_redirect",
  );
  assert.equal(parseAuthLink("nexora://auth/callback?code=abc").code, "abc");
  assert.equal(
    parseAuthLink("nexora://auth/callback#access_token=a&refresh_token=r").refreshToken,
    "r",
  );
});
