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
