import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, preflightResponse, rejectDisallowedOrigin } from "../_shared/http.ts";

type FeatureQuota = {
  allowed?: boolean;
  entitlement?: "free" | "premium";
  unlimited?: boolean;
  limit?: number;
  used?: number;
  remaining?: number | null;
  resetAt?: string;
};

const extractVideoId = (value: string) => {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    if (host === "youtu.be" || host === "www.youtu.be")
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (!["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) return null;
    const direct = url.searchParams.get("v");
    if (direct) return direct;
    const parts = url.pathname.split("/").filter(Boolean);
    if (["shorts", "embed", "live"].includes(parts[0] ?? "")) return parts[1] ?? null;
    return null;
  } catch {
    return null;
  }
};

const isoDurationToSeconds = (value: string | undefined) => {
  if (!value) return null;
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse(request);
  const rejected = rejectDisallowedOrigin(request);
  if (rejected) return rejected;
  if (request.method !== "POST") {
    return jsonResponse(request, { error: { code: "method_not_allowed" } }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!supabaseUrl || !anonKey || !apiKey) {
    return jsonResponse(request, { error: { code: "configuration_error" } }, 503);
  }

  const auth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return jsonResponse(request, { error: { code: "unauthorized" } }, 401);

  const input = await request.json().catch(() => ({}));
  const sourceUrl = String(input.url ?? "").slice(0, 2048);
  const videoId = extractVideoId(sourceUrl);
  if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
    return jsonResponse(request, { error: { code: "invalid_youtube_url" } }, 400);
  }

  const { data: rawQuota, error: quotaError } = await auth.rpc("claim_feature_usage", {
    p_feature: "creator_youtube_metadata",
    p_request_id: `creator-youtube-metadata:${videoId}:${crypto.randomUUID()}`,
  });
  if (quotaError) {
    console.error("creator_youtube_metadata_quota_error", quotaError.code);
    return jsonResponse(request, { error: { code: "quota_check_failed" } }, 500);
  }
  const quota = (rawQuota ?? {}) as FeatureQuota;
  if (quota.allowed !== true) {
    return jsonResponse(
      request,
      {
        error: {
          code: "daily_limit_reached",
          message: "Daily YouTube analysis limit reached.",
          quota,
        },
      },
      429,
    );
  }

  const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
  endpoint.searchParams.set("part", "snippet,contentDetails");
  endpoint.searchParams.set("id", videoId);
  endpoint.searchParams.set("key", apiKey);

  const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    console.error("creator_youtube_metadata_provider_error", response.status);
    return jsonResponse(request, { error: { code: "youtube_metadata_unavailable" } }, 502);
  }

  const payload = (await response.json().catch(() => null)) as {
    items?: Array<{
      id?: string;
      snippet?: {
        title?: string;
        channelTitle?: string;
        publishedAt?: string;
        thumbnails?: Record<string, { url?: string }>;
      };
      contentDetails?: { duration?: string };
    }>;
  } | null;
  const item = payload?.items?.[0];
  if (!item?.id || !item.snippet?.title) {
    return jsonResponse(request, { error: { code: "youtube_video_not_found" } }, 404);
  }

  const thumbnails = item.snippet.thumbnails ?? {};
  const thumbnailUrl =
    thumbnails.maxres?.url ??
    thumbnails.standard?.url ??
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url ??
    null;

  return jsonResponse(request, {
    videoId: item.id,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle ?? "",
    publishedAt: item.snippet.publishedAt ?? "",
    thumbnailUrl,
    durationSeconds: isoDurationToSeconds(item.contentDetails?.duration),
    downloadAvailable: false,
    originalUploadRequired: true,
    quota,
  });
});
