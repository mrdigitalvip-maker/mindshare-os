import { describe, expect, test } from "bun:test";
import {
  bestHistoricalWindow,
  classifyProviderError,
  confidence,
  normalizeTikTok,
  normalizeYouTube,
  redactSecrets,
  validateBenchmark,
} from "../src/domain";
describe("server-authoritative creator intelligence", () => {
  test("normalization preserves zero and omits missing/unsupported metrics", () => {
    expect(normalizeYouTube({ views: 0 })).toEqual({ views: 0 });
    expect(normalizeYouTube({ views: 1 })).not.toHaveProperty("retention_ratio");
    expect(normalizeTikTok({ view_count: 0 })).toEqual({ views: 0 });
    expect(normalizeTikTok({ view_count: 1 })).not.toHaveProperty("watch_time_ms");
  });
  test("recommendations require five comparable observations and are deterministic", () => {
    const rows = Array.from({ length: 5 }, (_, day) => ({
      publishedAt: `2026-08-${10 + day}T20:00:00Z`,
      value: 10,
    }));
    expect(bestHistoricalWindow(rows.slice(0, 4))).toBeUndefined();
    expect(bestHistoricalWindow(rows)?.startHour).toBe(20);
    expect(
      confidence({ sampleSize: 20, ageDays: 5, coefficientOfVariation: 0.2, completeness: 1 }),
    ).toBe(
      confidence({ sampleSize: 20, ageDays: 5, coefficientOfVariation: 0.2, completeness: 1 }),
    );
  });
  test("benchmarks need attribution and secrets are redacted", () => {
    expect(validateBenchmark({ sourceName: "x" })).toBe(false);
    expect(redactSecrets({ access_token: "fixture-token", ok: true })).not.toContain(
      "fixture-token",
    );
    expect(classifyProviderError(429)).toBe("rate_limited");
  });
});
