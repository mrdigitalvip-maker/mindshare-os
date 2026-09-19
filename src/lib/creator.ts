export const CREATOR_PLATFORMS = ["instagram", "tiktok", "youtube", "facebook"] as const;
export const CREATOR_METRICS = [
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

export type CreatorProfile = {
  experience: string;
  platforms: string[];
  niche: string;
  goal: string;
  primaryAudienceRegion: string;
  weeklyPostingCapacity: number;
  displayName: string;
  usernameIdeas: string[];
  bio: string;
  positioning: string;
  category: string;
  callToAction: string;
  contentPillars: string[];
  keywords: string[];
  brandTone: string;
  visualDirection: string;
};

export type CreatorStrategy = {
  platform: string;
  niche: string;
  goal: string;
  publishingFrequency: number;
  targetMarkets: string[];
  preferredContentFormats: string[];
  contentPillars: string[];
};

export type CreatorContent = {
  id?: string;
  platform: string;
  contentType: string;
  title: string;
  publishedAt: string;
  timezone: string;
  referenceUrl?: string;
  contentPillar?: string;
  durationMs?: number;
  notes?: string;
};

export type CreatorEvidence = {
  hasProfile: boolean;
  hasStrategy: boolean;
  contentCount: number;
  metricSnapshotCount: number;
};

export function creatorNextAction(evidence: CreatorEvidence) {
  if (!evidence.hasProfile) return { label: "Complete Creator Setup", section: "setup" };
  if (!evidence.hasStrategy) return { label: "Build Content Strategy", section: "strategy" };
  if (evidence.contentCount === 0) return { label: "Add your first content", section: "content" };
  if (evidence.metricSnapshotCount < 3)
    return { label: "Update manual analytics", section: "analytics" };
  return { label: "Review Creator Intelligence", section: "intelligence" };
}

export const CREATOR_ACADEMY = {
  START: ["Choose your niche", "Build your profile", "Content pillar basics"],
  GROWTH: ["Retention", "Storytelling", "Calls to action"],
  PRO: ["Content systems", "Experiments", "Audience analysis"],
} as const;


export type CreatorEvidenceSource = "manual" | "provider_verified";
export type CreatorEvidenceObservation = {
  contentId: string;
  source: CreatorEvidenceSource;
  value: number;
  publishedAt: string;
  weekday: number;
  hourWindow: string;
  platform: string;
  contentType?: string;
  contentPillar?: string;
};
export type CreatorProviderAnalyticsInput = {
  providerContentId?: string;
  platform: string;
  capturedAt: string;
  publishedAt?: string;
  contentType?: string;
  metrics: Record<string, unknown>;
};
export type CreatorManualMetricInput = {
  contentId: string;
  capturedAt: string;
  metrics: Record<string, unknown>;
};

const creatorMinimumSample = 5;

function creatorEvidenceConfidence(input: {
  observations: CreatorEvidenceObservation[];
  completeness: number;
  nowMs: number;
}) {
  if (input.observations.length < creatorMinimumSample) return "insufficient" as const;
  const values = input.observations.map((item) => item.value);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  const coefficientOfVariation = average > 0 ? Math.sqrt(variance) / average : 0;
  const newest = Math.max(...input.observations.map((item) => Date.parse(item.publishedAt) || 0));
  const ageDays = Math.max(0, (input.nowMs - newest) / 86_400_000);
  const score =
    Math.min(45, input.observations.length * 2) +
    Math.max(0, 20 - ageDays / 4.5) +
    Math.max(0, 20 * (1 - Math.min(1, coefficientOfVariation))) +
    15 * Math.max(0, Math.min(1, input.completeness));
  return score >= 75 ? ("high" as const) : score >= 50 ? ("medium" as const) : ("low" as const);
}

function creatorEvidenceGroups(observations: CreatorEvidenceObservation[]) {
  const group = (key: "weekday" | "hourWindow" | "platform" | "contentType" | "contentPillar") =>
    Object.values(
      observations.reduce<Record<string, { key: string; sampleCount: number; total: number }>>(
        (all, row) => {
          const value = String(row[key] ?? "");
          if (!value) return all;
          const entry = all[value] ?? { key: value, sampleCount: 0, total: 0 };
          entry.sampleCount += 1;
          entry.total += row.value;
          all[value] = entry;
          return all;
        },
        {},
      ),
    ).map((item) => ({ ...item, average: item.total / item.sampleCount }));

  const strongest = (rows: ReturnType<typeof group>) =>
    rows
      .filter((item) => item.sampleCount >= creatorMinimumSample)
      .sort((a, b) => b.average - a.average || a.key.localeCompare(b.key))[0] ?? null;

  const byWeekday = group("weekday");
  const byPostingWindow = group("hourWindow");
  return {
    byWeekday,
    byPostingWindow,
    byPlatform: group("platform"),
    byContentType: group("contentType"),
    byContentPillar: group("contentPillar"),
    strongestWeekday: strongest(byWeekday),
    strongestPostingWindow: strongest(byPostingWindow),
  };
}

export function creatorEvidenceIntelligence(input: {
  content: CreatorContent[];
  manualSnapshots: CreatorManualMetricInput[];
  providerAnalytics: CreatorProviderAnalyticsInput[];
  metric?: string;
  now?: string | number | Date;
}) {
  const metric = input.metric ?? "views";
  const latestManual = new Map<string, CreatorManualMetricInput>();
  for (const snapshot of [...input.manualSnapshots].sort((a, b) =>
    a.capturedAt.localeCompare(b.capturedAt),
  )) {
    latestManual.set(snapshot.contentId, snapshot);
  }
  const manualObservations: CreatorEvidenceObservation[] = input.content.flatMap((item) => {
    const value = latestManual.get(String(item.id ?? ""))?.metrics[metric];
    if (typeof value !== "number" || !Number.isFinite(value)) return [];
    const date = new Date(item.publishedAt);
    if (!Number.isFinite(date.getTime())) return [];
    const start = Math.floor(date.getHours() / 4) * 4;
    return [{
      contentId: String(item.id),
      source: "manual" as const,
      value,
      publishedAt: item.publishedAt,
      weekday: date.getDay(),
      hourWindow: `${String(start).padStart(2, "0")}:00–${String((start + 4) % 24).padStart(2, "0")}:00`,
      platform: item.platform,
      contentType: item.contentType,
      contentPillar: item.contentPillar,
    }];
  });

  const latestProvider = new Map<string, CreatorProviderAnalyticsInput>();
  for (const snapshot of [...input.providerAnalytics].sort((a, b) =>
    a.capturedAt.localeCompare(b.capturedAt),
  )) {
    const providerContentId = snapshot.providerContentId?.trim();
    if (providerContentId) latestProvider.set(`${snapshot.platform}:${providerContentId}`, snapshot);
  }
  const providerObservations: CreatorEvidenceObservation[] = [...latestProvider.entries()].flatMap(
    ([evidenceKey, snapshot]) => {
      const value = snapshot.metrics[metric];
      if (typeof value !== "number" || !Number.isFinite(value) || !snapshot.publishedAt) return [];
      const date = new Date(snapshot.publishedAt);
      if (!Number.isFinite(date.getTime())) return [];
      const start = Math.floor(date.getHours() / 4) * 4;
      return [{
        contentId: evidenceKey,
        source: "provider_verified" as const,
        value,
        publishedAt: snapshot.publishedAt,
        weekday: date.getDay(),
        hourWindow: `${String(start).padStart(2, "0")}:00–${String((start + 4) % 24).padStart(2, "0")}:00`,
        platform: snapshot.platform,
        contentType: snapshot.contentType,
      }];
    },
  );

  const selected =
    providerObservations.length >= creatorMinimumSample
      ? providerObservations
      : manualObservations.length >= creatorMinimumSample
        ? manualObservations
        : providerObservations.length >= manualObservations.length
          ? providerObservations
          : manualObservations;
  const source: CreatorEvidenceSource =
    selected === providerObservations ? "provider_verified" : "manual";
  const completeness =
    source === "provider_verified"
      ? latestProvider.size ? providerObservations.length / latestProvider.size : 0
      : input.content.length ? manualObservations.length / input.content.length : 0;
  const nowMs =
    input.now instanceof Date
      ? input.now.getTime()
      : typeof input.now === "number"
        ? input.now
        : typeof input.now === "string"
          ? Date.parse(input.now)
          : Date.now();

  return {
    metric,
    source,
    sampleCount: selected.length,
    providerSampleCount: providerObservations.length,
    manualSampleCount: manualObservations.length,
    confidence: creatorEvidenceConfidence({ observations: selected, completeness, nowMs }),
    observations: selected,
    ...creatorEvidenceGroups(selected),
  };
}
