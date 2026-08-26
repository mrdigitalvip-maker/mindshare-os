import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  canUseFeature,
  getFeatureLimit,
  getRemainingUsage,
  PLAN_LIMITS,
} from "../lib/entitlements";
import { isPremiumEntitlement, normalizeEntitlement } from "../lib/subscription";
import {
  getAndroidPurchaseAvailability,
  isPlayBillingAvailable,
} from "../lib/purchase-capabilities";
import { loadPlayProduct, PlayBillingUnavailableError } from "../services/play-billing-service";
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
  test("tester purchasing capability is deterministic and independent of entitlement", () => {
    expect(getAndroidPurchaseAvailability()).toBe("unavailable_for_tester_build");
    expect(isPlayBillingAvailable()).toBe(false);
    expect(isPremiumEntitlement(normalizeEntitlement("active"))).toBe(true);
    expect(isPremiumEntitlement(normalizeEntitlement("free"))).toBe(false);
  });
  test("disabled billing adapter fails safely without loading a native module", async () => {
    await expect(loadPlayProduct()).rejects.toBeInstanceOf(PlayBillingUnavailableError);
    const adapter = readFileSync("services/play-billing-service.ts", "utf8");
    expect(adapter).not.toContain('from "react-native-iap"');
    expect(adapter).not.toContain("require(\"react-native-iap\")");
  });
  test("tester Premium UX has no purchase CTA or fabricated price", () => {
    const premium = readFileSync("app/(app)/premium.tsx", "utf8");
    expect(premium).toContain("Assinaturas Premium estarão disponíveis em breve.");
    expect(premium).not.toContain("ASSINAR PREMIUM");
    expect(premium).not.toContain("Restaurar compra");
    expect(premium).not.toMatch(/US\$|R\$|\/mês/);
  });
  test("mobile startup and Expo config do not require native IAP", () => {
    const root = readFileSync("app/_layout.tsx", "utf8");
    const premium = readFileSync("app/(app)/premium.tsx", "utf8");
    const app = JSON.parse(readFileSync("app.json", "utf8"));
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(root).not.toContain("play-billing-service");
    expect(premium).not.toContain("play-billing-service");
    expect(app.expo.plugins).not.toContain("react-native-iap");
    expect(pkg.dependencies["react-native-iap"]).toBeUndefined();
    expect(pkg.dependencies["react-native-nitro-modules"]).toBeUndefined();
  });
  test("server remains authoritative for Assistant usage and downgrade preserves rows", () => {
    const ai = readFileSync("../supabase/functions/ai-chat/index.ts", "utf8");
    const monetization = readFileSync("../supabase/migrations/202608260002_monetization.sql", "utf8");
    expect(ai).toContain('from("ai_usage")');
    expect(ai).toContain("dailyUsage(supabase, user.id)");
    expect(monetization).toContain("enforce_free_creation_limits");
    expect(monetization).not.toMatch(/delete\s+from\s+(projects|tasks|study_subjects)/i);
  });
  test("optional notification routing failure is non-fatal", () => {
    const routing = readFileSync("hooks/use-notification-routing.ts", "utf8");
    expect(routing).toContain("notification routing is unavailable");
    expect(routing).toContain("received?.remove()");
  });
});
