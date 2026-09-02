import assert from "node:assert/strict";
import test from "node:test";
import { isConfiguredLegalUrl, LEGAL_URLS } from "../lib/legal.ts";
import {
  notificationCopy,
  notificationReadiness,
  subscriptionPlanLabel,
  testPushSucceeded,
  validateProfileName,
} from "../lib/settings-state.ts";
import { notificationRoute, normalizePushToken } from "../lib/notification-routing.ts";
test("Settings and Premium share truthful plan presentation", () => {
  assert.equal(subscriptionPlanLabel("active"), "Premium");
  assert.equal(subscriptionPlanLabel("trialing"), "Premium");
  assert.equal(subscriptionPlanLabel("free"), "Gratuito");
  assert.equal(subscriptionPlanLabel("expired"), "Gratuito");
});
test("device readiness combines permission and registration", () => {
  assert.equal(notificationReadiness("granted", true), "active");
  assert.equal(notificationReadiness("granted", false), "needs-registration");
  assert.equal(notificationReadiness("denied", false), "denied");
  assert.equal(notificationReadiness("blocked", false), "blocked");
  assert.equal(notificationReadiness("undetermined", false), "undetermined");
  assert.equal(notificationReadiness("unsupported", false), "unsupported");
  assert.equal(notificationCopy.blocked.action, "Abrir configurações do Android");
});
test("notification routes are bounded and malformed payloads fall back safely", () => {
  assert.equal(notificationRoute(null), "/dashboard");
  assert.equal(notificationRoute({ kind: "task", resourceId: "task-1" }), "/tasks/task-1");
  assert.equal(notificationRoute({ kind: "project", resourceId: "project-1" }), "/projects/project-1");
  assert.equal(notificationRoute({ kind: "study", resourceId: "study-1" }), "/studies/study-1");
  assert.equal(notificationRoute({ kind: "journey", resourceId: "journey-1" }), "/journeys/journey-1");
  assert.equal(notificationRoute({ kind: "mission", resourceId: "mission-1" }), "/journeys");
  assert.equal(notificationRoute({ kind: "task", resourceId: "https://evil.example" }), "/dashboard");
});
test("push tokens are normalized without accepting arbitrary or malformed values", () => {
  assert.equal(normalizePushToken(" ExpoPushToken[abc_123] "), "ExpoPushToken[abc_123]");
  assert.equal(normalizePushToken("secret"), null);
});
test("push feedback requires an accepted delivery", () => {
  assert.equal(testPushSucceeded({ accepted: 1, failed: 0 }), true);
  assert.equal(testPushSucceeded({ accepted: 0, failed: 0 }), false);
});
test("profile names are validated", () => {
  assert.ok(validateProfileName(" "));
  assert.ok(validateProfileName("N".repeat(81)));
  assert.equal(validateProfileName(" Nexora User "), null);
});
test("legal documents use configured HTTPS URLs", () => {
  assert.equal(isConfiguredLegalUrl(LEGAL_URLS.privacyPolicy), true);
  assert.equal(isConfiguredLegalUrl(LEGAL_URLS.termsOfService), true);
  assert.equal(isConfiguredLegalUrl("javascript:void(0)"), false);
});
