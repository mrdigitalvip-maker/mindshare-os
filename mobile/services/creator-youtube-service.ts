import { supabase } from "@/lib/supabase";

export type CreatorYouTubeMetadata = {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
};

export type CreatorYouTubeMetadataErrorCode =
  | "configuration_error"
  | "origin_not_allowed"
  | "unauthorized"
  | "invalid_youtube_url"
  | "quota_check_failed"
  | "daily_limit_reached"
  | "youtube_provider_configuration"
  | "youtube_provider_quota"
  | "youtube_video_not_found"
  | "youtube_metadata_unavailable";

const ERROR_CODES = new Set<CreatorYouTubeMetadataErrorCode>([
  "configuration_error",
  "origin_not_allowed",
  "unauthorized",
  "invalid_youtube_url",
  "quota_check_failed",
  "daily_limit_reached",
  "youtube_provider_configuration",
  "youtube_provider_quota",
  "youtube_video_not_found",
  "youtube_metadata_unavailable",
]);

export class CreatorYouTubeMetadataError extends Error {
  constructor(public readonly code: CreatorYouTubeMetadataErrorCode) {
    super(code);
    this.name = "CreatorYouTubeMetadataError";
  }
}

function isErrorCode(value: unknown): value is CreatorYouTubeMetadataErrorCode {
  return typeof value === "string" && ERROR_CODES.has(value as CreatorYouTubeMetadataErrorCode);
}

async function invokeError(error: unknown): Promise<CreatorYouTubeMetadataError> {
  const context =
    error && typeof error === "object" && "context" in error
      ? (error as { context?: unknown }).context
      : null;
  if (context && typeof context === "object" && "clone" in context) {
    try {
      const payload = (await (context as Response).clone().json()) as {
        error?: { code?: unknown };
        code?: unknown;
      };
      const code = payload?.error?.code ?? payload?.code;
      if (isErrorCode(code)) return new CreatorYouTubeMetadataError(code);
    } catch {
      // Keep the UI on a safe, non-provider-specific fallback.
    }
  }
  const message = error instanceof Error ? error.message : "";
  const code = [...ERROR_CODES].find((candidate) => message.includes(candidate));
  return new CreatorYouTubeMetadataError(code ?? "youtube_metadata_unavailable");
}

export async function fetchCreatorYouTubeMetadata(url: string): Promise<CreatorYouTubeMetadata> {
  const value = url.trim();
  if (!value) throw new CreatorYouTubeMetadataError("invalid_youtube_url");
  const { data, error } = await supabase.functions.invoke("creator-youtube-metadata", {
    body: { url: value },
  });
  if (error) throw await invokeError(error);
  if (!data || typeof data !== "object")
    throw new CreatorYouTubeMetadataError("youtube_metadata_unavailable");

  const result = data as Partial<CreatorYouTubeMetadata> & {
    error?: { code?: unknown } | string;
  };
  const responseCode =
    typeof result.error === "object" && result.error ? result.error.code : result.error;
  if (responseCode) {
    throw new CreatorYouTubeMetadataError(
      isErrorCode(responseCode) ? responseCode : "youtube_metadata_unavailable",
    );
  }
  if (
    typeof result.videoId !== "string" ||
    typeof result.title !== "string" ||
    typeof result.channelTitle !== "string" ||
    typeof result.publishedAt !== "string"
  )
    throw new CreatorYouTubeMetadataError("youtube_metadata_unavailable");
  return {
    videoId: result.videoId,
    title: result.title,
    channelTitle: result.channelTitle,
    publishedAt: result.publishedAt,
    thumbnailUrl: typeof result.thumbnailUrl === "string" ? result.thumbnailUrl : null,
    durationSeconds: typeof result.durationSeconds === "number" ? result.durationSeconds : null,
  };
}
