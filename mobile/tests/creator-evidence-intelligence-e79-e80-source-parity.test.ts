import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import {
  creatorCopilotContext,
  creatorEvidenceIntelligence,
  type CreatorAnalyticsSnapshot,
  type CreatorContentLog,
  type CreatorManualSnapshot,
} from "../lib/creator";

const analyticsScreen = readFileSync(
  fileURLToPath(new URL("../app/(app)/creator/analytics.tsx", import.meta.url)),
  "utf8",
);

const content = Array.from({ length: 6 }, (_, index): CreatorContentLog => ({
  id: `manual-${index}`,
  platform: "youtube",
  contentType: "short",
  title: `Manual ${index}`,
  publishedAt: `2026-09-${String(10 + index).padStart(2, "0")}T20:00:00Z`,
  timezone: "UTC",
}));

const manualSnapshots = content.map((item, index): CreatorManualSnapshot => ({
  id: `snapshot-${index}`,
  contentId: item.id,
  platform: "youtube",
  capturedAt: `2026-09-${String(10 + index).padStart(2, "0")}T23:00:00Z`,
  sourceType: "manual",
  enteredByUser: true,
  metrics: { views: 100 + index },
}));

const provider = (count: number): CreatorAnalyticsSnapshot[] =>
  Array.from({ length: count }, (_, index) => ({
    platform: "youtube",
    capturedAt: `2026-09-${String(10 + index).padStart(2, "0")}T23:30:00Z`,
    publishedAt: `2026-09-${String(10 + index).padStart(2, "0")}T20:00:00Z`,
    providerContentId: `verified-${index}`,
    contentType: "short",
    metrics: { views: 1000 + index },
    grantedMetricNames: ["views"],
  }));

describe("E79/E80 evidence-aware Creator intelligence", () => {
  test("provider-verified evidence wins only after it has the minimum real sample", () => {
    const result = creatorEvidenceIntelligence({
      content,
      manualSnapshots,
      providerAnalytics: provider(5),
      now: "2026-09-19T00:00:00Z",
    });
    expect(result.source).toBe("provider_verified");
    expect(result.sampleCount).toBe(5);
    expect(result.providerSampleCount).toBe(5);
    expect(result.manualSampleCount).toBe(6);
    expect(result.strongestPostingWindow?.sampleCount).toBe(5);
  });

  test("manual evidence stays primary while verified evidence is insufficient", () => {
    const result = creatorEvidenceIntelligence({
      content,
      manualSnapshots,
      providerAnalytics: provider(4),
      now: "2026-09-19T00:00:00Z",
    });
    expect(result.source).toBe("manual");
    expect(result.sampleCount).toBe(6);
    expect(result.providerSampleCount).toBe(4);
  });

  test("insufficient samples never produce a strong posting window", () => {
    const result = creatorEvidenceIntelligence({
      content: content.slice(0, 4),
      manualSnapshots: manualSnapshots.slice(0, 4),
      providerAnalytics: [],
      now: "2026-09-19T00:00:00Z",
    });
    expect(result.confidence).toBe("insufficient");
    expect(result.strongestPostingWindow).toBeNull();
  });

  test("Copilot receives derived evidence intelligence and the UI exposes provenance", () => {
    const context = creatorCopilotContext({
      analytics: provider(5),
      content,
      manualSnapshots,
    });
    expect(context).toHaveProperty("performanceIntelligence");
    expect(JSON.stringify(context)).toContain("provider_verified");
    expect(analyticsScreen).toContain("creatorEvidenceIntelligence");
    expect(analyticsScreen).toContain("Provider sample");
    expect(analyticsScreen).toContain("Amostra do provedor");
  });
});
