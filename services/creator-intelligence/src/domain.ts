export const NORMALIZED_METRICS = [
  "views",
  "reach",
  "watch_time_ms",
  "average_view_duration_ms",
  "retention_ratio",
  "likes",
  "comments",
  "shares",
  "saves",
  "followers_gained",
] as const;
export type MetricName = (typeof NORMALIZED_METRICS)[number];
export type Metrics = Partial<Record<MetricName, number>>;
export type Provider = "youtube" | "tiktok" | "instagram";
export interface CreatorAnalyticsProvider {
  identifyAccount(): Promise<{ providerAccountId: string; displayName?: string }>;
  listContent(): Promise<
    Array<{ providerContentId: string; publishedAt: string; contentType?: string }>
  >;
  fetchMetrics(): Promise<NormalizedSnapshot[]>;
  refreshCredentials(): Promise<{ expiresAt?: string }>;
}

export type NormalizedSnapshot = {
  provider: Provider;
  providerAccountId: string;
  providerContentId?: string;
  capturedAt: string;
  sourceTimestamp: string;
  grantedMetricNames: MetricName[];
  metrics: Metrics;
  countryIso?: string;
  periodStart?: string;
  periodEnd?: string;
};

const finite = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
const take = (input: Record<string, unknown>, fields: Record<string, MetricName>) =>
  Object.fromEntries(
    Object.entries(fields).flatMap(([source, target]) => {
      const value = finite(input[source]);
      return value === undefined ? [] : [[target, value]];
    }),
  ) as Metrics;

/** YouTube Analytics values are supplied after header/row decoding. Seconds become milliseconds. */
export function normalizeYouTube(input: Record<string, unknown>): Metrics {
  const result = take(input, {
    views: "views",
    likes: "likes",
    comments: "comments",
    subscribersGained: "followers_gained",
  });
  const watched = finite(input.estimatedMinutesWatched);
  const average = finite(input.averageViewDuration);
  if (watched !== undefined) result.watch_time_ms = watched * 60_000;
  if (average !== undefined) result.average_view_duration_ms = average * 1_000;
  return result;
}

/** TikTok Display API exposes these counters; unsupported analytics are deliberately absent. */
export function normalizeTikTok(input: Record<string, unknown>): Metrics {
  return take(input, {
    view_count: "views",
    like_count: "likes",
    comment_count: "comments",
    share_count: "shares",
  });
}

export function normalizeInstagram(input: Record<string, unknown>): Metrics {
  return take(input, {
    views: "views",
    reach: "reach",
    likes: "likes",
    comments: "comments",
    shares: "shares",
    saved: "saves",
    follows: "followers_gained",
  });
}

export type Confidence = "insufficient" | "low" | "medium" | "high";
/** Score = sample (0..45) + recency (0..20) + consistency (0..20) + completeness (0..15). */
export function confidence(input: {
  sampleSize: number;
  ageDays: number;
  coefficientOfVariation: number;
  completeness: number;
}): Confidence {
  if (input.sampleSize < 5) return "insufficient";
  const score =
    Math.min(45, input.sampleSize * 2) +
    Math.max(0, 20 - input.ageDays / 4.5) +
    Math.max(0, 20 * (1 - Math.min(1, input.coefficientOfVariation))) +
    15 * Math.max(0, Math.min(1, input.completeness));
  return score >= 75 ? "high" : score >= 50 ? "medium" : "low";
}

export type PerformanceObservation = { publishedAt: string; value: number };
export function historicalPostingWindows(rows: PerformanceObservation[], timeZone = "UTC") {
  const buckets = new Map<number, number[]>();
  for (const row of rows) {
    const hour = Number(
      new Intl.DateTimeFormat("en", { hour: "2-digit", hourCycle: "h23", timeZone }).format(
        new Date(row.publishedAt),
      ),
    );
    const start = Math.floor(hour / 2) * 2;
    buckets.set(start, [...(buckets.get(start) ?? []), row.value]);
  }
  return [...buckets].map(([startHour, values]) => ({
    startHour,
    endHour: (startHour + 2) % 24,
    sampleSize: values.length,
    average: values.reduce((a, b) => a + b, 0) / values.length,
  }));
}
export function bestHistoricalWindow(rows: PerformanceObservation[], timeZone = "UTC") {
  const eligible = historicalPostingWindows(rows, timeZone).filter((x) => x.sampleSize >= 5);
  return eligible.sort((a, b) => b.average - a.average || a.startHour - b.startHour)[0];
}

export type BenchmarkRow = {
  sourceName: string;
  sourceUrl: string;
  publicationDate: string;
  collectionPeriod: string;
  platform: Provider;
  region: string;
  sampleSize?: number;
  methodology: string;
  metric: string;
  window: string;
  limitations: string;
  datasetVersion: string;
};
export function validateBenchmark(row: Partial<BenchmarkRow>): row is BenchmarkRow {
  return (
    [
      row.sourceName,
      row.sourceUrl,
      row.publicationDate,
      row.collectionPeriod,
      row.platform,
      row.region,
      row.methodology,
      row.metric,
      row.window,
      row.limitations,
      row.datasetVersion,
    ].every((v) => typeof v === "string" && v.trim().length > 0) &&
    /^https:\/\//.test(row.sourceUrl!)
  );
}
export function classifyProviderError(status: number) {
  return status === 401
    ? "credential_expired"
    : status === 429
      ? "rate_limited"
      : status >= 500
        ? "provider_unavailable"
        : "provider_request_failed";
}
export const redactSecrets = (value: unknown) =>
  JSON.stringify(value, (key, item) =>
    /token|secret|password|code_verifier/i.test(key) ? "[REDACTED]" : item,
  );
