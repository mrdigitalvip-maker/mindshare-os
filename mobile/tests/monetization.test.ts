import { describe, expect, test } from "bun:test";
import {
  canUseFeature,
  getFeatureLimit,
  getRemainingUsage,
  PLAN_LIMITS,
} from "../lib/entitlements";
import { isPremiumEntitlement, normalizeEntitlement } from "../lib/subscription";
describe("canonical monetization", () => {
  test("free, active, trial and expired entitlement", () => {
    expect(isPremiumEntitlement(normalizeEntitlement(null))).toBe(false);
    expect(isPremiumEntitlement(normalizeEntitlement("active"))).toBe(true);
    expect(isPremiumEntitlement(normalizeEntitlement("trialing"))).toBe(true);
    expect(isPremiumEntitlement(normalizeEntitlement("expired"))).toBe(false);
  });
  test("central daily quotas", () => {
    expect(PLAN_LIMITS.free.assistantDaily).toBe(10);
    expect(PLAN_LIMITS.premium.assistantDaily).toBe(100);
    expect(getFeatureLimit("free", "assistant.attachment")).toBe(2);
    expect(getFeatureLimit("premium", "assistant.attachment")).toBe(20);
    expect(getRemainingUsage(10, 7)).toBe(3);
  });
  test("advanced intelligence is gated", () => {
    expect(canUseFeature("free", "assistant.basic")).toBe(true);
    expect(canUseFeature("free", "studies.tutor")).toBe(false);
    expect(canUseFeature("premium", "studies.tutor")).toBe(true);
  });
});
