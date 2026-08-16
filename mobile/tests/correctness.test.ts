import assert from "node:assert/strict";
import test from "node:test";

import { resolveAppDestination, resolveAuthStatus } from "../lib/auth-state.ts";
import { resolveCapabilityTier } from "../lib/capabilities.ts";
import { normalizePushToken, notificationRoute } from "../lib/notification-routing.ts";
import { normalizeAmplitude, normalizeNexoraState } from "../lib/nexora-state.ts";
import { queryKeys, taskMutationInvalidations } from "../lib/query-keys.ts";
import { normalizeEntitlement } from "../lib/subscription.ts";

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
  assert.equal(notificationRoute({ kind: "study", resourceId: "../bad" }), "/dashboard");
});
test("NEXORA visual inputs are guarded", () => {
  assert.equal(normalizeNexoraState("unknown"), "idle");
  assert.equal(normalizeAmplitude(Number.NaN), 0);
  assert.equal(normalizeAmplitude(2), 1);
  assert.equal(normalizeAmplitude(-1), 0);
});
