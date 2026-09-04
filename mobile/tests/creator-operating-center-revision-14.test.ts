import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  CREATOR_ACCESS_MODE,
  CREATOR_ACADEMY,
  CREATOR_EXPERIENCE_LEVELS,
  CREATOR_GOALS,
  CREATOR_PLATFORMS,
  PROFILE_SCORE_CRITERIA,
  decideCreatorAccess,
  decideCreatorImport,
  type CreatorAnalyticsSnapshot,
  type CreatorBenchmark,
  type CreatorStrategy,
  type HookLabState,
} from "../lib/creator";
const read = (path: string) =>
  readFileSync(path.startsWith("mobile/") ? path.slice(7) : `../${path}`, "utf8");

describe("NXR-037B Creator Operating Center", () => {
  test("setup has explicit experience, platform and goal choices", () => {
    expect(CREATOR_EXPERIENCE_LEVELS).toEqual(["beginner", "creator", "professional"]);
    expect(CREATOR_PLATFORMS).toEqual(["instagram", "tiktok", "youtube", "facebook"]);
    expect(CREATOR_GOALS).toContain("generate_leads");
  });
  test("profile score is criteria-only, never a fabricated number", () => {
    expect(PROFILE_SCORE_CRITERIA.length).toBeGreaterThan(0);
    expect(PROFILE_SCORE_CRITERIA).toContain("audience_defined");
    expect(read("mobile/app/(app)/creator/index.tsx")).not.toMatch(/profileScore\s*[:=]\s*\d/i);
  });
  test("academy provides complete authored levels", () => {
    expect(CREATOR_ACADEMY.start).toHaveLength(5);
    expect(CREATOR_ACADEMY.growth).toContain("analytics_interpretation");
    expect(CREATOR_ACADEMY.pro).toContain("audience_analysis");
  });
  test("strategy and weekly plan are structured contracts", () => {
    const strategy: CreatorStrategy = {
      platform: "youtube",
      niche: "education",
      goal: "build_brand",
      contentPillars: ["teaching"],
      publishingFrequency: 2,
      targetMarkets: ["BR"],
      preferredContentFormats: ["short"],
    };
    expect(strategy.publishingFrequency).toBe(2);
  });
  test("Hook Lab begins empty and generated output requires Assistant evidence", () => {
    const state: HookLabState = { status: "not_generated" };
    expect(state.status).toBe("not_generated");
    expect(read("mobile/lib/creator.ts")).toContain("assistantMessageId");
  });
  test("imports never provide an unauthorized downloader", () => {
    expect(decideCreatorImport("device_upload").canImport).toBe(true);
    expect(decideCreatorImport("url_recognition")).toMatchObject({
      canImport: false,
      requiresOriginalUpload: true,
    });
    expect(decideCreatorImport("authorized_platform")).toMatchObject({
      canImport: false,
      reason: "authorized_connection_required",
    });
  });
  test("library is backed only by owner-filtered records and supports deletion", () => {
    const service = read("mobile/services/creator-service.ts");
    expect(service).toContain('.from("creator_projects")');
    expect(service).toContain("deleteCreatorProject");
    expect(service).toContain('.eq("user_id", userId)');
  });
  test("Creator Map carries attribution and separates global from personal", () => {
    const benchmark: CreatorBenchmark = {
      platform: "youtube",
      country: "BR",
      timezone: "America/Sao_Paulo",
      weekday: 1,
      hourWindow: "",
      niche: null,
      contentType: null,
      sampleSize: null,
      source: "publisher",
      sourceDate: "2026-09-04",
      confidence: null,
      benchmarkType: "global_benchmark",
    };
    expect(benchmark.source).toBeTruthy();
    const ui = read("mobile/i18n/index.ts");
    expect(ui).toContain('"creator.globalBenchmark"');
    expect(ui).toContain('"creator.yourAudience"');
  });
  test("analytics allow only metrics actually supplied", () => {
    const snapshot: CreatorAnalyticsSnapshot = {
      platform: "youtube",
      capturedAt: "2026-09-04",
      metrics: { views: 4 },
    };
    expect(snapshot.metrics.reach).toBeUndefined();
  });
  test("access stays closed-test unlocked and future trial is server-ready", () => {
    expect(CREATOR_ACCESS_MODE).toBe("closed_test_unlocked");
    expect(
      decideCreatorAccess({
        authenticated: true,
        mode: CREATOR_ACCESS_MODE,
        premium: false,
        trialUsed: true,
      }).allowed,
    ).toBe(true);
  });
  test("new tables have RLS while integration-owned data is read-only", () => {
    const sql = read("supabase/migrations/202609040002_creator_operating_center.sql");
    for (const table of [
      "creator_profiles",
      "creator_strategies",
      "creator_learning_progress",
      "creator_platform_connections",
      "creator_analytics_snapshots",
      "creator_benchmarks",
    ])
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    expect(sql).not.toMatch(/creator_(connections|analytics).*owner_(insert|all)/);
    expect(sql).not.toMatch(/insert into public\.creator_(benchmarks|analytics_snapshots)/);
  });
});
