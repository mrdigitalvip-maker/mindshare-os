export const CREATOR_ACCESS_MODE = "closed_test_unlocked" as const;
/** Provider connections are an automation upgrade, never a Creator Center prerequisite. */
export const CREATOR_DOMAIN_MODE = "standalone" as const;
export type CreatorAccessMode = typeof CREATOR_ACCESS_MODE | "premium_with_trial";
export function decideCreatorAccess(input: {
  authenticated: boolean;
  mode: CreatorAccessMode;
  premium: boolean;
  trialUsed: boolean;
}) {
  if (!input.authenticated) return { allowed: false, reason: "authentication_required" as const };
  if (input.mode === "closed_test_unlocked")
    return { allowed: true, reason: "closed_test" as const };
  if (input.premium) return { allowed: true, reason: "premium" as const };
  if (!input.trialUsed) return { allowed: true, reason: "trial" as const };
  return { allowed: false, reason: "upgrade_required" as const };
}

export const CREATOR_ASPECT_RATIOS = ["9:16", "1:1", "16:9"] as const;
export const CREATOR_CLIP_DURATIONS = [15, 20, 30, 45, 60] as const;
export const CREATOR_CAPTION_MODES = ["automatic", "off"] as const;
export const CREATOR_JOB_STATES = [
  "draft",
  "uploading",
  "queued",
  "analyzing",
  "transcribing",
  "selecting_clips",
  "rendering",
  "completed",
  "failed",
  "cancelled",
] as const;
export type CreatorJobState = (typeof CREATOR_JOB_STATES)[number];
const transitions: Record<CreatorJobState, CreatorJobState[]> = {
  draft: ["uploading", "cancelled"],
  uploading: ["queued", "failed", "cancelled"],
  queued: ["analyzing", "failed", "cancelled"],
  analyzing: ["transcribing", "failed", "cancelled"],
  transcribing: ["selecting_clips", "failed", "cancelled"],
  selecting_clips: ["rendering", "failed", "cancelled"],
  rendering: ["completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};
export function canTransitionCreatorJob(from: CreatorJobState, to: CreatorJobState) {
  return transitions[from].includes(to);
}
export function recognizeCreatorUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const youtube = ["youtube.com", "www.youtube.com", "youtu.be", "www.youtu.be"].includes(
      url.hostname.toLowerCase(),
    );
    return {
      valid: url.protocol === "https:",
      youtube,
      canDownload: false,
      requiresOriginalUpload: true,
    };
  } catch {
    return { valid: false, youtube: false, canDownload: false, requiresOriginalUpload: true };
  }
}
export type ClipIntelligence = {
  hookStrength: number;
  clarity: number;
  topicDensity: number;
  speechCompleteness: number;
  sceneContinuity: number;
  energy: number;
  retentionPotential: number;
  endingStrength: number;
};
export type CreatorEditorDraft = {
  trimStartMs: number;
  trimEndMs: number;
  aspectRatio: (typeof CREATOR_ASPECT_RATIOS)[number];
  captions: boolean;
  captionStyle?: string;
};

export const CREATOR_EXPERIENCE_LEVELS = ["beginner", "creator", "professional"] as const;
export const CREATOR_PLATFORMS = ["instagram", "tiktok", "youtube", "facebook"] as const;
export const CREATOR_GOALS = [
  "grow_followers",
  "build_brand",
  "monetize",
  "sell_product_or_service",
  "generate_leads",
] as const;

export type CreatorProfileDraft = {
  experience: (typeof CREATOR_EXPERIENCE_LEVELS)[number];
  platforms: (typeof CREATOR_PLATFORMS)[number][];
  niche: string;
  goal: (typeof CREATOR_GOALS)[number];
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

/** Criteria contract only. A score must not be presented until a real scorer is implemented. */
export const PROFILE_SCORE_CRITERIA = [
  "identity_complete",
  "positioning_clear",
  "audience_defined",
  "call_to_action_present",
  "content_pillars_defined",
  "discoverability_keywords_present",
] as const;

export type CreatorStrategy = {
  platform: (typeof CREATOR_PLATFORMS)[number];
  niche: string;
  goal: (typeof CREATOR_GOALS)[number];
  contentPillars: string[];
  publishingFrequency: number;
  targetMarkets: string[];
  preferredContentFormats: string[];
};
export type CreatorWeeklyPlanItem = {
  id: string;
  weekday: number;
  contentPillar: string;
  format: string;
  status: "planned" | "published" | "cancelled";
};

export type HookLabInput = {
  topic: string;
  platform: (typeof CREATOR_PLATFORMS)[number];
  audience: string;
  goal: string;
  tone: string;
};
export type HookLabOutput = {
  hooks: string[];
  titles: string[];
  caption: string;
  callToAction: string;
  keywords: string[];
  hashtags: string[];
  assistantMessageId: string;
  generatedAt: string;
};
export type HookLabState =
  { status: "not_generated" } | { status: "generated"; output: HookLabOutput };

export function acceptHookLabResponse(value: unknown): HookLabState {
  if (!value || typeof value !== "object") return { status: "not_generated" };
  const candidate = value as Partial<HookLabOutput>;
  const stringList = (item: unknown): item is string[] =>
    Array.isArray(item) && item.length > 0 && item.every((entry) => typeof entry === "string");
  if (
    !stringList(candidate.hooks) ||
    !stringList(candidate.titles) ||
    typeof candidate.caption !== "string" ||
    typeof candidate.callToAction !== "string" ||
    !stringList(candidate.keywords) ||
    !stringList(candidate.hashtags) ||
    typeof candidate.assistantMessageId !== "string" ||
    typeof candidate.generatedAt !== "string"
  )
    return { status: "not_generated" };
  return { status: "generated", output: candidate as HookLabOutput };
}

export const CREATOR_ACADEMY = {
  start: ["niche", "profile", "content_pillars", "hook_basics", "consistency"],
  growth: ["retention", "storytelling", "cta", "testing_formats", "analytics_interpretation"],
  pro: ["content_systems", "experimentation", "repurposing", "distribution", "audience_analysis"],
} as const;

export type CreatorBenchmark = {
  platform: string;
  country: string;
  timezone: string;
  weekday: number;
  hourWindow: string;
  niche: string | null;
  contentType: string | null;
  sampleSize: number | null;
  source: string;
  sourceDate: string;
  confidence: string | null;
  benchmarkType: "global_benchmark" | "your_audience";
};
export type CreatorAnalyticsSnapshot = {
  platform: string;
  capturedAt: string;
  metrics: Partial<
    Record<
      | "views"
      | "reach"
      | "watch_time_ms"
      | "average_view_duration_ms"
      | "retention_ratio"
      | "likes"
      | "comments"
      | "shares"
      | "saves"
      | "followers_gained",
      number
    >
  >;
  country?: string;
  weekday?: number;
  hour?: number;
  contentType?: string;
  providerContentId?: string;
  publishedAt?: string;
  sourceTimestamp?: string;
  grantedMetricNames?: string[];
};

export const CREATOR_CONTENT_PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "other",
] as const;
export const CREATOR_CONTENT_TYPES = ["reel", "short", "video", "post", "story", "other"] as const;
export const CREATOR_MANUAL_METRICS = [
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
export type CreatorManualMetric = (typeof CREATOR_MANUAL_METRICS)[number];
export type CreatorContentLog = {
  id: string;
  platform: (typeof CREATOR_CONTENT_PLATFORMS)[number];
  contentType: (typeof CREATOR_CONTENT_TYPES)[number];
  title: string;
  publishedAt: string;
  timezone: string;
  referenceUrl?: string;
  contentPillar?: string;
  durationMs?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};
export type CreatorManualSnapshot = {
  id: string;
  contentId: string;
  platform: CreatorContentLog["platform"];
  capturedAt: string;
  sourceType: "manual";
  enteredByUser: true;
  metrics: Partial<Record<CreatorManualMetric, number | null>>;
};
export type CreatorCountryObservation = {
  id: string;
  platform: CreatorContentLog["platform"];
  countryIso?: string;
  countryName: string;
  metricContext: string;
  value: number;
  period: string;
  notes?: string;
  sourceType: "manual";
  enteredByUser: true;
  capturedAt: string;
};

/** Empty inputs stay null; importantly, an authoritative string/number zero survives. */
export function parseOptionalMetric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export type CreatorEvidence = {
  source: "manual" | "provider_verified" | "global_benchmark";
  sampleCount: number;
};
export const CREATOR_MINIMUM_SAMPLE = 5;
export function creatorHistoricalPerformance(
  content: CreatorContentLog[],
  snapshots: CreatorManualSnapshot[],
  metric: CreatorManualMetric = "views",
) {
  const latest = new Map<string, CreatorManualSnapshot>();
  for (const snapshot of [...snapshots].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)))
    latest.set(snapshot.contentId, snapshot);
  const observations = content.flatMap((item) => {
    const value = latest.get(item.id)?.metrics[metric];
    if (typeof value !== "number") return [];
    const date = new Date(item.publishedAt);
    return [
      {
        contentId: item.id,
        value,
        weekday: date.getDay(),
        hourWindow: `${String(Math.floor(date.getHours() / 4) * 4).padStart(2, "0")}:00–${String(Math.floor(date.getHours() / 4) * 4 + 4).padStart(2, "0")}:00`,
        platform: item.platform,
        contentType: item.contentType,
        contentPillar: item.contentPillar,
      },
    ];
  });
  const group = (key: "weekday" | "hourWindow" | "platform" | "contentType" | "contentPillar") =>
    Object.values(
      observations.reduce<Record<string, { key: string; sampleCount: number; total: number }>>(
        (all, row) => {
          const value = String(row[key] ?? "");
          if (!value) return all;
          const entry = all[value] ?? { key: value, sampleCount: 0, total: 0 };
          entry.sampleCount++;
          entry.total += row.value;
          all[value] = entry;
          return all;
        },
        {},
      ),
    ).map((x) => ({ ...x, average: x.total / x.sampleCount }));
  const byWeekday = group("weekday"),
    byPostingWindow = group("hourWindow");
  const strongest = (rows: ReturnType<typeof group>) =>
    rows
      .filter((x) => x.sampleCount >= CREATOR_MINIMUM_SAMPLE)
      .sort((a, b) => b.average - a.average)[0] ?? null;
  return {
    metric,
    observations,
    byWeekday,
    byPostingWindow,
    byPlatform: group("platform"),
    byContentType: group("contentType"),
    byContentPillar: group("contentPillar"),
    strongestWeekday: strongest(byWeekday),
    strongestPostingWindow: strongest(byPostingWindow),
    evidence: { source: "manual", sampleCount: observations.length } as CreatorEvidence,
  };
}

export type CreatorNextAction =
  "complete_setup" | "build_strategy" | "add_content" | "update_results" | "review_intelligence";
export function creatorNextAction(input: {
  hasProfile: boolean;
  hasStrategy: boolean;
  contentCount: number;
  analyticsSampleCount: number;
}): CreatorNextAction {
  if (!input.hasProfile) return "complete_setup";
  if (!input.hasStrategy) return "build_strategy";
  if (!input.contentCount) return "add_content";
  if (input.analyticsSampleCount < CREATOR_MINIMUM_SAMPLE) return "update_results";
  return "review_intelligence";
}

export type CreatorConnectionStatus =
  "not_connected" | "authorizing" | "connected" | "expired" | "revoked" | "error";
export type CreatorPlatformConnection = {
  id: string;
  platform: "youtube" | "tiktok" | "instagram";
  status: CreatorConnectionStatus;
  displayName?: string;
  lastSuccessAt?: string;
  grantedMetrics: string[];
};
export const CREATOR_PROVIDER_CAPABILITIES = {
  youtube: {
    readiness: "CONFIG_REQUIRED",
    metrics: [
      "views",
      "watch_time_ms",
      "average_view_duration_ms",
      "likes",
      "comments",
      "followers_gained",
      "country",
      "day",
    ],
  },
  tiktok: { readiness: "APP_REVIEW_REQUIRED", metrics: ["views", "likes", "comments", "shares"] },
  instagram: { readiness: "APP_REVIEW_REQUIRED", metrics: [], requirement: "professional_account" },
} as const;

export function creatorConfidence(input: {
  sampleSize: number;
  ageDays: number;
  coefficientOfVariation: number;
  completeness: number;
}) {
  if (input.sampleSize < 5) return "insufficient" as const;
  const score =
    Math.min(45, input.sampleSize * 2) +
    Math.max(0, 20 - input.ageDays / 4.5) +
    Math.max(0, 20 * (1 - Math.min(1, input.coefficientOfVariation))) +
    15 * Math.max(0, Math.min(1, input.completeness));
  return score >= 75 ? ("high" as const) : score >= 50 ? ("medium" as const) : ("low" as const);
}

export function presentCreatorMetrics(snapshot: CreatorAnalyticsSnapshot) {
  return Object.entries(snapshot.metrics).filter(
    (entry): entry is [keyof CreatorAnalyticsSnapshot["metrics"], number] =>
      typeof entry[1] === "number",
  );
}

export type CreatorGoal = {
  id: string;
  title: string;
  milestones: { id: string; label: string; completed: boolean }[];
};

export function creatorCopilotContext(input: {
  profile?: CreatorProfileDraft | null;
  strategy?: CreatorStrategy | null;
  analytics?: CreatorAnalyticsSnapshot[] | null;
  content?: CreatorContentLog[] | null;
  manualSnapshots?: CreatorManualSnapshot[] | null;
  goals?: CreatorGoal[] | null;
}) {
  const manualAnalytics = input.manualSnapshots?.length
    ? {
        observations: input.manualSnapshots,
        evidence: { source: "manual", sampleCount: input.manualSnapshots.length },
      }
    : undefined;
  return Object.fromEntries(
    Object.entries({
      profile: input.profile || undefined,
      strategy: input.strategy || undefined,
      creatorGoals: input.goals?.length ? input.goals : undefined,
      contentHistory: input.content?.length ? input.content : undefined,
      manualAnalytics,
      providerAnalytics: input.analytics?.length
        ? {
            observations: input.analytics,
            evidence: { source: "provider_verified", sampleCount: input.analytics.length },
          }
        : undefined,
    }).filter(([, value]) => value !== undefined),
  );
}

export function creatorBestTimeGuard(sampleCount: number) {
  return sampleCount < CREATOR_MINIMUM_SAMPLE
    ? { available: false as const, action: "add_content_results" as const }
    : { available: true as const };
}

export function creatorAssistantPrompt(action: string, context: Record<string, unknown>) {
  return `[CREATOR_CONTEXT_V1]\n${JSON.stringify({ action, context })}\n[/CREATOR_CONTEXT_V1]\nUse only supplied evidence. Distinguish manual from provider-verified data and state sample counts. Never invent missing performance, benchmarks, or a best posting time.`;
}

export type CreatorImportDecision = {
  source: "device_upload" | "authorized_platform" | "url_recognition";
  canImport: boolean;
  requiresOriginalUpload: boolean;
  reason: "original_file" | "authorized_connection_required" | "metadata_only";
};
export function decideCreatorImport(
  source: CreatorImportDecision["source"],
): CreatorImportDecision {
  if (source === "device_upload")
    return { source, canImport: true, requiresOriginalUpload: false, reason: "original_file" };
  if (source === "authorized_platform")
    return {
      source,
      canImport: false,
      requiresOriginalUpload: false,
      reason: "authorized_connection_required",
    };
  return { source, canImport: false, requiresOriginalUpload: true, reason: "metadata_only" };
}
