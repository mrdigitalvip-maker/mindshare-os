export const CREATOR_ACCESS_MODE = "closed_test_unlocked" as const;
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
