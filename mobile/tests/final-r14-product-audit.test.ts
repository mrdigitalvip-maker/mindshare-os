import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
const root = join(process.cwd(), "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("NXR-036 final product contracts", () => {
  test("all native release surfaces remain routed", () => {
    for (const route of [
      "dashboard",
      "assistant",
      "projects/index",
      "productivity",
      "studies/index",
      "journeys/index",
      "packs/index",
      "arena",
      "community/index",
      "premium",
      "settings",
      "creator/index",
      "creator/copilot",
      "creator/analytics",
      "creator/goals",
      "creator/map",
      "creator/library",
    ])
      expect(
        existsSync(join(root, `mobile/app/(app)/${route}.tsx`)) ||
          existsSync(join(root, `mobile/app/(app)/(tabs)/${route}.tsx`)),
      ).toBeTrue();
  });
  test("shared features use canonical Supabase tables and RPCs", () => {
    const services = [
      "mobile/services/workspace-service.ts",
      "mobile/services/community-service.ts",
      "mobile/services/journey-service.ts",
      "mobile/services/creator-service.ts",
    ]
      .map(read)
      .join("\n");
    for (const contract of [
      "profiles",
      "projects",
      "tasks",
      "study_subjects",
      "journeys",
      "creator_profiles",
    ])
      expect(services).toContain(contract);
    expect(read("mobile/services/journey-service.ts")).toContain("ensure_daily_journey_mission");
  });
  test("premium and Creator remain authoritative and standalone", () => {
    expect(read("mobile/services/subscription-service.ts")).toContain('.from("subscriptions")');
    expect(read("mobile/services/play-billing-service.ts")).not.toContain("react-native-iap");
    const creator = read("mobile/services/creator-service.ts");
    expect(creator).toContain('source_type: "manual"');
    expect(creator).not.toMatch(/fake|mock creator/i);
  });
  test("production demo and fabricated backend success are prohibited", () => {
    expect(read("src/lib/demo/config.ts")).toContain("import.meta.env.DEV");
    expect(read("src/lib/demo/fallback.ts")).toContain("throw new Error");
    expect(read("mobile/services/notification-service.ts")).not.toMatch(
      /return\s+\{[^}]*success:\s*true/s,
    );
  });
  test("release identity and notification safety stay canonical", () => {
    const app = JSON.parse(read("mobile/app.json"));
    expect(app.expo.scheme).toBe("kivryn");
    expect(app.expo.android.package).toBe("kivryn.app");
    expect(app.expo.android.intentFilters[0].data[0].scheme).toBe("kivryn");
    expect(app.expo.slug).toBe("nexora-native");
    expect(app.expo.extra.eas.projectId).toBe("307c1e13-5eb2-41fc-99ea-27f2ef392ff7");
    expect(read("mobile/services/notification-service.ts")).toContain("user_id");
  });
});
