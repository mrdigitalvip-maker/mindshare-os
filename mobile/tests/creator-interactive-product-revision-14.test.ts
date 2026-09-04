import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  acceptHookLabResponse,
  creatorCopilotContext,
  decideCreatorImport,
  presentCreatorMetrics,
} from "../lib/creator";
import { translations } from "../i18n";
const root = process.cwd();
const source = (p: string) => readFileSync(join(root, p), "utf8");
describe("NXR-037B2 interactive Creator product", () => {
  test("all interactive routes exist", () => {
    for (const p of [
      "setup.tsx",
      "profile.tsx",
      "pillars.tsx",
      "strategy.tsx",
      "hook-lab.tsx",
      "academy/index.tsx",
      "academy/[lessonKey].tsx",
      "library.tsx",
      "import.tsx",
      "map.tsx",
      "analytics.tsx",
      "copilot.tsx",
      "goals.tsx",
    ])
      expect(existsSync(join(root, "app/(app)/creator", p))).toBe(true);
  });
  test("setup loads and upserts one owner profile", () => {
    const s = source("services/creator-service.ts");
    expect(s).toContain("loadCreatorProfile");
    expect(s).toContain('{ onConflict: "user_id" }');
    expect(s).toContain('.eq("user_id", userId)');
  });
  test("profile builder and pillar CRUD persist", () => {
    expect(source("app/(app)/creator/profile.tsx")).toContain("saveCreatorProfile");
    const s = source("app/(app)/creator/pillars.tsx");
    for (const x of [
      "move(i, -1)",
      "move(i, 1)",
      "filter((_, j) => j !== i)",
      "saveCreatorProfile",
    ])
      expect(s).toContain(x);
  });
  test("strategy updates without fabricated schedules", () => {
    const s = source("app/(app)/creator/strategy.tsx");
    expect(s).toContain("saveCreatorStrategy");
    expect(s).not.toMatch(/generate.*schedule/i);
  });
  test("hook output stays absent without a valid real response", () => {
    expect(acceptHookLabResponse(null)).toEqual({ status: "not_generated" });
    expect(acceptHookLabResponse({ hooks: ["x"] })).toEqual({ status: "not_generated" });
    expect(source("app/(app)/creator/hook-lab.tsx")).toContain("disabled");
  });
  test("academy navigates and owner completion persists", () => {
    expect(source("app/(app)/creator/academy/index.tsx")).toContain("router.push");
    const s = source("services/creator-service.ts");
    expect(s).toContain("setLessonCompletion");
    expect(s).toContain('eq("user_id", userId)');
  });
  test("library reads real owner projects and owner-scoped deletion", () => {
    const s = source("services/creator-service.ts");
    expect(s).toContain("listCreatorProjects");
    expect(s).toContain("deleteCreatorProject");
    expect(source("app/(app)/creator/library.tsx")).not.toMatch(/thumbnail|clipsCount/);
  });
  test("URL import never downloads arbitrary URLs", () => {
    expect(decideCreatorImport("url_recognition")).toMatchObject({
      canImport: false,
      requiresOriginalUpload: true,
    });
    expect(source("app/(app)/creator/import.tsx")).not.toMatch(/fetch\(|downloadAsync/);
  });
  test("map keeps global and audience empty states distinct", () => {
    const s = source("app/(app)/creator/map.tsx");
    expect(s).toContain('t("creator.globalBenchmark")');
    expect(s).toContain('t("creator.yourAudience")');
    expect((translations.en as Record<string, string>)["creator.noBenchmarkDataset"]).toBe(
      "No benchmark dataset loaded.",
    );
  });
  test("analytics omit unavailable metrics rather than zero-fill", () => {
    expect(
      presentCreatorMetrics({ platform: "x", capturedAt: "now", metrics: { views: 0 } }),
    ).toEqual([["views", 0]]);
    expect(presentCreatorMetrics({ platform: "x", capturedAt: "now", metrics: {} })).toEqual([]);
  });
  test("copilot omits unavailable context", () => {
    expect(creatorCopilotContext({ profile: null, strategy: null, analytics: [] })).toEqual({});
    expect((translations.en as Record<string, string>)["creator.openAssistant"]).toContain(
      "NEXORA",
    );
  });
  test("goals use only manual milestones", () => {
    const s =
      source("app/(app)/creator/goals.tsx") +
      source("../supabase/migrations/202609040003_creator_interactive_product.sql");
    expect(s).toContain("milestones");
    expect(s).not.toMatch(/timer|followers_gained/);
  });
  test("PT-BR and English cover every interactive key", () => {
    expect(Object.keys(translations["pt-BR"]).sort()).toEqual(Object.keys(translations.en).sort());
    for (const key of Object.keys(translations.en).filter((k) => k.startsWith("creator."))) {
      expect((translations.en as Record<string, string>)[key]).toBeTruthy();
      expect((translations["pt-BR"] as Record<string, string>)[key]).toBeTruthy();
    }
  });
  test("language preference is separate from Creator persistence", () => {
    expect(source("providers/language-provider.tsx")).not.toMatch(
      /creator_profiles|queryClient|signOut/,
    );
  });
  test("migration enforces owner RLS and preserves server-authoritative ingestion", () => {
    const s = source("../supabase/migrations/202609040003_creator_interactive_product.sql");
    expect(s).toContain("auth.uid() = user_id");
    expect(s).not.toMatch(/creator_analytics_snapshots|creator_benchmarks/);
  });
  test("does not change billing", () => {
    expect(source("app/(app)/creator/index.tsx")).not.toMatch(/billing|react-native-iap/);
  });
  test("contains no fake Creator scores or metrics", () => {
    const paths = ["setup.tsx", "profile.tsx", "strategy.tsx", "map.tsx", "analytics.tsx"];
    const s = paths.map((p) => source(`app/(app)/creator/${p}`)).join("\n");
    expect(s).not.toMatch(/profile score|content score|fake followers|fake views/i);
  });
});
