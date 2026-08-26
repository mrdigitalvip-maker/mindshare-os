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
  assert.equal(notificationReadiness("unsupported", false), "unsupported");
  assert.equal(notificationCopy.blocked.action, "Abrir configurações do aparelho");
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
