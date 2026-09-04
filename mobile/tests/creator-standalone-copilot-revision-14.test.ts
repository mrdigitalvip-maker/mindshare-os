import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  CREATOR_DOMAIN_MODE,
  creatorAssistantPrompt,
  creatorBestTimeGuard,
  creatorCopilotContext,
  creatorHistoricalPerformance,
  creatorNextAction,
  parseOptionalMetric,
  type CreatorContentLog,
  type CreatorManualSnapshot,
} from "../lib/creator";
const read = (path: string) =>
  readFileSync(path.startsWith("mobile/") ? path.slice(7) : `../${path}`, "utf8");
const migration = read("supabase/migrations/202609040006_creator_standalone_copilot.sql"),
  service = read("mobile/services/creator-service.ts"),
  analytics = read("mobile/app/(app)/creator/analytics.tsx"),
  map = read("mobile/app/(app)/creator/map.tsx"),
  copilot = read("mobile/app/(app)/creator/copilot.tsx"),
  hooks = read("mobile/app/(app)/creator/hook-lab.tsx"),
  home = read("mobile/app/(app)/creator/index.tsx"),
  i18n = read("mobile/i18n/index.ts");
const content: CreatorContentLog[] = Array.from({ length: 5 }, (_, i) => ({
  id: `${i}`,
  platform: "youtube",
  contentType: "short",
  title: `${i}`,
  publishedAt: `2026-09-02T20:0${i}:00Z`,
  timezone: "UTC",
  contentPillar: "education",
}));
const snapshots: CreatorManualSnapshot[] = content.map((x, i) => ({
  id: `s${i}`,
  contentId: x.id,
  platform: x.platform,
  capturedAt: `2026-09-03T00:0${i}:00Z`,
  sourceType: "manual",
  enteredByUser: true,
  metrics: { views: i === 0 ? 0 : i * 100, shares: i % 2 ? null : i },
}));
describe("NXR-037E standalone Creator Center", () => {
  test("zero-provider mode is explicit and valid", () => {
    expect(CREATOR_DOMAIN_MODE).toBe("standalone");
    expect(analytics).toContain("connectedCount");
    expect(analytics).not.toContain("CONFIG_REQUIRED");
  });
  test("manual content has owner CRUD and confirmed deletion", () => {
    expect(service).toMatch(/listCreatorContent|saveCreatorContent|deleteCreatorContent/);
    expect(migration).toContain("creator_content_log_owner_all");
    expect(analytics).toContain("Alert.alert");
  });
  test("unknown metric stays null and zero survives", () => {
    expect(parseOptionalMetric("")).toBeNull();
    expect(parseOptionalMetric(0)).toBe(0);
    expect(migration).toContain("views numeric");
  });
  test("manual provenance is canonical", () => {
    expect(migration).toContain("source_type text not null default 'manual'");
    expect(migration).toContain("entered_by_user boolean not null default true");
    expect(service).toContain('source_type: "manual"');
  });
  test("manual and provider provenance remain separate", () => {
    const context = creatorCopilotContext({
      analytics: [{ platform: "youtube", capturedAt: "x", metrics: { views: 1 } }],
      manualSnapshots: snapshots,
    });
    expect((context.manualAnalytics as { evidence: { source: string } }).evidence.source).toBe(
      "manual",
    );
    expect((context.providerAnalytics as { evidence: { source: string } }).evidence.source).toBe(
      "provider_verified",
    );
  });
  test("metric updates append snapshot history", () => {
    expect(service).toMatch(/from\("creator_manual_metric_snapshots"\)[\s\S]*?\.insert/);
    expect(migration).toContain("Append-only");
  });
  test("weekday and posting-window use published timestamps and real metrics", () => {
    const result = creatorHistoricalPerformance(content, snapshots);
    expect(result.observations).toHaveLength(5);
    expect(result.strongestWeekday?.sampleCount).toBe(5);
    expect(result.strongestPostingWindow?.key).toBe("20:00–24:00");
    expect(result.byContentPillar[0].sampleCount).toBe(5);
  });
  test("insufficient sample makes no best-time claim", () => {
    expect(creatorBestTimeGuard(1)).toEqual({ available: false, action: "add_content_results" });
    expect(
      creatorHistoricalPerformance(content.slice(0, 1), snapshots).strongestPostingWindow,
    ).toBeNull();
  });
  test("manual countries power map and are labeled", () => {
    expect(service).toMatch(/listCreatorManualCountries|saveCreatorManualCountry/);
    expect(map).toContain("manualAudienceSource");
    expect(i18n).toContain("Manually entered audience data");
  });
  test("global benchmark remains empty", () => {
    expect(map).toContain("noBenchmarkDataset");
    expect(migration).not.toMatch(/insert into public\.creator_benchmarks/i);
  });
  test("Copilot omits missing context and sends provenance/sample", () => {
    expect(creatorCopilotContext({})).toEqual({});
    const prompt = creatorAssistantPrompt(
      "analyze",
      creatorCopilotContext({ manualSnapshots: snapshots }),
    );
    expect(prompt).toContain('"source":"manual"');
    expect(prompt).toContain('"sampleCount":5');
  });
  test("Copilot explicitly forbids invention", () => {
    expect(creatorAssistantPrompt("best time", {})).toContain("Never invent");
    expect(copilot).toContain("creatorAssistantPrompt");
  });
  test("Hook Lab and ideas require the real Assistant", () => {
    expect(hooks).toContain("assistant-chat");
    expect(hooks).not.toMatch(/fallback|mock|fake/i);
    expect(read("mobile/app/(app)/creator/ideas.tsx")).toContain("assistant-chat");
  });
  test("next-action state machine is deterministic", () => {
    expect(
      creatorNextAction({
        hasProfile: false,
        hasStrategy: false,
        contentCount: 0,
        analyticsSampleCount: 0,
      }),
    ).toBe("complete_setup");
    expect(
      creatorNextAction({
        hasProfile: true,
        hasStrategy: true,
        contentCount: 1,
        analyticsSampleCount: 5,
      }),
    ).toBe("review_intelligence");
  });
  test("goals stay manual without evidence", () => {
    expect(read("mobile/app/(app)/creator/goals.tsx")).toContain("manualProgress");
    expect(read("mobile/app/(app)/creator/goals.tsx")).not.toContain("followers_gained");
  });
  test("Creator actions use canonical tasks", () => {
    expect(home).toContain('createTask } from "@/services/workspace-service"');
    expect(migration).not.toMatch(/create table public\.creator_tasks/i);
  });
  test("social credentials are not required or read by mobile", () => {
    expect([analytics, service, home].join("\n")).not.toMatch(
      /YOUTUBE_CLIENT_ID|TIKTOK_CLIENT_KEY|INSTAGRAM_CLIENT/,
    );
  });
  test("PT-BR and English calm copy exist", () => {
    expect(i18n).toContain("Conecte suas contas futuramente para automatizar seus dados.");
    expect(i18n).toContain("Connect your accounts later to automate your data.");
  });
  test("provider architecture, local video, and billing stay intact", () => {
    expect(read("supabase/migrations/202609040005_creator_intelligence.sql")).toContain(
      "creator_provider_credentials",
    );
    expect(read("mobile/lib/creator.ts")).toContain('source === "device_upload"');
    expect(read("mobile/package.json")).not.toContain("react-native-iap");
  });
});
