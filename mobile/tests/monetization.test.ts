import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
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
  test("Play verification uses the unchanged Android application ID", () => {
    const app = JSON.parse(readFileSync("app.json", "utf8"));
    const billingSource = readFileSync("services/play-billing-service.ts", "utf8");
    expect(app.expo.android.package).toBe("app.vercel.nexora_os_eosin.twa");
    expect(billingSource).toContain(`packageName: "${app.expo.android.package}"`);
    expect(billingSource).not.toContain("US$ 12/mês");
  });
});
