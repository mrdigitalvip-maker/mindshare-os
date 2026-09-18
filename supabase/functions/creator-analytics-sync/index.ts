import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, preflightResponse, rejectDisallowedOrigin } from "../_shared/http.ts";
import {
  decryptServerSecret,
  encryptServerSecret,
  safeProviderError,
} from "../_shared/creator-intelligence.ts";

type AdminClient = ReturnType<typeof createClient>;
type CreatorConnection = {
  id: string;
  user_id: string;
  platform: "youtube" | "tiktok" | "instagram";
  external_account_id: string | null;
  granted_scopes: string[] | null;
  next_allowed_at: string | null;
};

type NormalizedContent = {
  providerContentId: string;
  title: string | null;
  publishedAt: string;
  durationMs: number | null;
  sourceUrl: string | null;
  contentType: string | null;
  metrics: Record<string, number>;
  metricPeriodStart?: string;
  metricPeriodEnd?: string;
};

const YOUTUBE_READ_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const YOUTUBE_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/yt-analytics.readonly";
const TIKTOK_VIDEO_SCOPE = "video.list";
const SYNC_COOLDOWN_MS = 15 * 60_000;

const finiteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const maybeMetric = (
  target: Record<string, number>,
  key: string,
  value: unknown,
  transform?: (value: number) => number,
) => {
  const parsed = finiteNumber(value);
  if (parsed === undefined) return;
  target[key] = transform ? transform(parsed) : parsed;
};

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

function youtubeDurationMs(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  return (
    (Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)) * 1000
  );
}

async function fingerprint(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((part) => part.toString(16).padStart(2, "0")).join("");
}

async function providerJson(url: string, access: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${access}`,
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw Object.assign(new Error("provider_request_failed"), {
      providerStatus: response.status,
    });
  }
  return await response.json();
}

async function resolveProviderAccess(
  admin: AdminClient,
  connection: CreatorConnection,
  credential: {
    access_token_ciphertext: string;
    refresh_token_ciphertext: string | null;
    expires_at: string | null;
    scopes: string[] | null;
  },
) {
  let scopes = Array.isArray(credential.scopes) ? credential.scopes.map(String) : [];
  const expiresAt = credential.expires_at ? Date.parse(credential.expires_at) : Number.POSITIVE_INFINITY;
  if (expiresAt > Date.now() + 5 * 60_000) {
    return { access: await decryptServerSecret(credential.access_token_ciphertext), scopes };
  }
  if (!credential.refresh_token_ciphertext) {
    throw Object.assign(new Error("credential_expired"), { providerStatus: 401 });
  }

  const refreshToken = await decryptServerSecret(credential.refresh_token_ciphertext);
  const isYouTube = connection.platform === "youtube";
  const clientId = Deno.env.get(isYouTube ? "YOUTUBE_CLIENT_ID" : "TIKTOK_CLIENT_KEY");
  const clientSecret = Deno.env.get(isYouTube ? "YOUTUBE_CLIENT_SECRET" : "TIKTOK_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("provider_not_configured");

  const body = new URLSearchParams(
    isYouTube
      ? {
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }
      : {
          client_key: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        },
  );
  const response = await fetch(
    isYouTube
      ? "https://oauth2.googleapis.com/token"
      : "https://open.tiktokapis.com/v2/oauth/token/",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  if (!response.ok) {
    throw Object.assign(new Error("credential_expired"), { providerStatus: 401 });
  }
  const refreshed = (await response.json()) as Record<string, unknown>;
  const accessToken = typeof refreshed.access_token === "string" ? refreshed.access_token : "";
  if (!accessToken) {
    throw Object.assign(new Error("credential_expired"), { providerStatus: 401 });
  }
  if (typeof refreshed.scope === "string" && refreshed.scope.trim()) {
    scopes = refreshed.scope.split(/[ ,]+/).filter(Boolean);
  }
  const rotatedRefresh =
    typeof refreshed.refresh_token === "string" && refreshed.refresh_token
      ? refreshed.refresh_token
      : refreshToken;
  const expiresIn = finiteNumber(refreshed.expires_in);
  const updated = await admin
    .from("creator_provider_credentials")
    .update({
      access_token_ciphertext: await encryptServerSecret(accessToken),
      refresh_token_ciphertext: await encryptServerSecret(rotatedRefresh),
      expires_at:
        expiresIn === undefined ? credential.expires_at : new Date(Date.now() + expiresIn * 1000).toISOString(),
      scopes,
      updated_at: new Date().toISOString(),
    })
    .eq("connection_id", connection.id);
  if (updated.error) throw new Error("credential_refresh_persistence_failed");
  return { access: accessToken, scopes };
}

async function youtubeSync(access: string): Promise<NormalizedContent[]> {
  const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
  channelUrl.searchParams.set("part", "id,contentDetails");
  channelUrl.searchParams.set("mine", "true");
  const channelPayload = (await providerJson(channelUrl.toString(), access)) as {
    items?: Array<{
      id?: string;
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    }>;
  };
  const channel = channelPayload.items?.[0];
  const uploads = channel?.contentDetails?.relatedPlaylists?.uploads;
  if (!channel?.id || !uploads) throw new Error("youtube_channel_unavailable");

  const playlistUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  playlistUrl.searchParams.set("part", "snippet,contentDetails");
  playlistUrl.searchParams.set("playlistId", uploads);
  playlistUrl.searchParams.set("maxResults", "50");
  const playlistPayload = (await providerJson(playlistUrl.toString(), access)) as {
    items?: Array<{
      contentDetails?: { videoId?: string; videoPublishedAt?: string };
      snippet?: { title?: string; publishedAt?: string };
    }>;
  };
  const uploadRows = (playlistPayload.items ?? [])
    .map((item) => ({
      id: String(item.contentDetails?.videoId ?? ""),
      title: typeof item.snippet?.title === "string" ? item.snippet.title : null,
      publishedAt:
        item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt ?? new Date(0).toISOString(),
    }))
    .filter((item) => /^[A-Za-z0-9_-]{6,20}$/.test(item.id));

  const videosById = new Map<
    string,
    {
      id: string;
      snippet?: { title?: string; publishedAt?: string };
      contentDetails?: { duration?: string };
      statistics?: Record<string, unknown>;
    }
  >();
  if (uploadRows.length) {
    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("part", "id,snippet,contentDetails,statistics");
    videosUrl.searchParams.set("id", uploadRows.map((row) => row.id).join(","));
    const videosPayload = (await providerJson(videosUrl.toString(), access)) as {
      items?: Array<{
        id?: string;
        snippet?: { title?: string; publishedAt?: string };
        contentDetails?: { duration?: string };
        statistics?: Record<string, unknown>;
      }>;
    };
    for (const item of videosPayload.items ?? []) {
      if (item.id) videosById.set(item.id, { ...item, id: item.id });
    }
  }

  const periodEndDate = new Date();
  periodEndDate.setUTCDate(periodEndDate.getUTCDate() - 1);
  const periodStartDate = new Date(periodEndDate);
  periodStartDate.setUTCDate(periodStartDate.getUTCDate() - 27);
  const periodStart = isoDate(periodStartDate);
  const periodEnd = isoDate(periodEndDate);
  const analyticsById = new Map<string, Record<string, number>>();

  const analyticsUrl = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
  analyticsUrl.searchParams.set("ids", "channel==MINE");
  analyticsUrl.searchParams.set("startDate", periodStart);
  analyticsUrl.searchParams.set("endDate", periodEnd);
  analyticsUrl.searchParams.set("dimensions", "video");
  analyticsUrl.searchParams.set(
    "metrics",
    "views,comments,likes,shares,estimatedMinutesWatched,averageViewDuration,subscribersGained",
  );
  analyticsUrl.searchParams.set("sort", "-views");
  analyticsUrl.searchParams.set("maxResults", "200");

  try {
    const analytics = (await providerJson(analyticsUrl.toString(), access)) as {
      columnHeaders?: Array<{ name?: string }>;
      rows?: unknown[][];
    };
    const headers = (analytics.columnHeaders ?? []).map((header) => String(header.name ?? ""));
    const videoIndex = headers.indexOf("video");
    for (const row of analytics.rows ?? []) {
      const id = videoIndex >= 0 ? String(row[videoIndex] ?? "") : "";
      if (!id) continue;
      const metrics: Record<string, number> = {};
      for (let index = 0; index < headers.length; index += 1) {
        const name = headers[index];
        const value = row[index];
        if (name === "views") maybeMetric(metrics, "views", value);
        else if (name === "comments") maybeMetric(metrics, "comments", value);
        else if (name === "likes") maybeMetric(metrics, "likes", value);
        else if (name === "shares") maybeMetric(metrics, "shares", value);
        else if (name === "estimatedMinutesWatched")
          maybeMetric(metrics, "watch_time_ms", value, (minutes) => Math.round(minutes * 60_000));
        else if (name === "averageViewDuration")
          maybeMetric(metrics, "average_view_duration_ms", value, (seconds) => Math.round(seconds * 1000));
        else if (name === "subscribersGained") maybeMetric(metrics, "followers_gained", value);
      }
      analyticsById.set(id, metrics);
    }
  } catch (error) {
    const status = Number((error as { providerStatus?: unknown }).providerStatus);
    if (status === 401) throw error;
    // Data API statistics remain authoritative provider evidence if Analytics reporting
    // is disabled, unavailable, or restricted. Missing Analytics-only metrics stay missing.
  }

  return uploadRows.map((upload) => {
    const video = videosById.get(upload.id);
    const statistics = video?.statistics ?? {};
    const lifetimeMetrics: Record<string, number> = {};
    maybeMetric(lifetimeMetrics, "views", statistics.viewCount);
    maybeMetric(lifetimeMetrics, "likes", statistics.likeCount);
    maybeMetric(lifetimeMetrics, "comments", statistics.commentCount);
    const analyticsMetrics = analyticsById.get(upload.id);
    return {
      providerContentId: upload.id,
      title: video?.snippet?.title ?? upload.title,
      publishedAt: video?.snippet?.publishedAt ?? upload.publishedAt,
      durationMs: youtubeDurationMs(video?.contentDetails?.duration),
      sourceUrl: `https://www.youtube.com/watch?v=${upload.id}`,
      contentType: "video",
      metrics: analyticsMetrics && Object.keys(analyticsMetrics).length ? analyticsMetrics : lifetimeMetrics,
      ...(analyticsMetrics && Object.keys(analyticsMetrics).length
        ? { metricPeriodStart: periodStart, metricPeriodEnd: periodEnd }
        : {}),
    };
  });
}

async function tiktokSync(access: string): Promise<NormalizedContent[]> {
  const endpoint = new URL("https://open.tiktokapis.com/v2/video/list/");
  endpoint.searchParams.set(
    "fields",
    [
      "id",
      "title",
      "video_description",
      "create_time",
      "duration",
      "share_url",
      "view_count",
      "like_count",
      "comment_count",
      "share_count",
    ].join(","),
  );
  const payload = (await providerJson(endpoint.toString(), access, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ max_count: 20 }),
  })) as {
    data?: {
      videos?: Array<Record<string, unknown>>;
      video_list?: Array<Record<string, unknown>>;
    };
  };
  const videos = payload.data?.videos ?? payload.data?.video_list ?? [];
  return videos
    .map((video): NormalizedContent | null => {
      const id = String(video.id ?? "");
      const created = finiteNumber(video.create_time);
      if (!id || created === undefined) return null;
      const metrics: Record<string, number> = {};
      maybeMetric(metrics, "views", video.view_count);
      maybeMetric(metrics, "likes", video.like_count);
      maybeMetric(metrics, "comments", video.comment_count);
      maybeMetric(metrics, "shares", video.share_count);
      const duration = finiteNumber(video.duration);
      const title =
        typeof video.title === "string" && video.title.trim()
          ? video.title.trim()
          : typeof video.video_description === "string" && video.video_description.trim()
            ? video.video_description.trim()
            : null;
      return {
        providerContentId: id,
        title,
        publishedAt: new Date(created * 1000).toISOString(),
        durationMs: duration === undefined ? null : Math.round(duration * 1000),
        sourceUrl: typeof video.share_url === "string" ? video.share_url : null,
        contentType: "video",
        metrics,
      };
    })
    .filter((item): item is NormalizedContent => item !== null);
}

async function persistProviderRows(
  admin: AdminClient,
  connection: CreatorConnection,
  rows: NormalizedContent[],
) {
  let contentCount = 0;
  let snapshotCount = 0;
  const observedMetrics = new Set<string>();

  for (const row of rows) {
    const contentWrite = await admin.from("creator_analytics_content").upsert(
      {
        user_id: connection.user_id,
        connection_id: connection.id,
        platform: connection.platform,
        provider_content_id: row.providerContentId,
        content_type: row.contentType,
        title: row.title,
        published_at: row.publishedAt,
        duration_ms: row.durationMs,
        source_url: row.sourceUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "connection_id,provider_content_id" },
    );
    if (contentWrite.error) throw new Error("content_persistence_failed");
    contentCount += 1;

    const metricNames = Object.keys(row.metrics);
    if (!metricNames.length) continue;
    metricNames.forEach((metric) => observedMetrics.add(metric));
    const payloadFingerprint = await fingerprint({
      providerContentId: row.providerContentId,
      metrics: row.metrics,
      periodStart: row.metricPeriodStart ?? null,
      periodEnd: row.metricPeriodEnd ?? null,
    });
    const sourceSnapshotKey = `${row.providerContentId}:${payloadFingerprint}`;
    const existing = await admin
      .from("creator_analytics_snapshots")
      .select("id")
      .eq("connection_id", connection.id)
      .eq("source_snapshot_key", sourceSnapshotKey)
      .maybeSingle();
    if (existing.error) throw new Error("snapshot_lookup_failed");
    if (existing.data) continue;

    const inserted = await admin.from("creator_analytics_snapshots").insert({
      user_id: connection.user_id,
      connection_id: connection.id,
      platform: connection.platform,
      captured_at: new Date().toISOString(),
      metrics: row.metrics,
      provider_account_id: connection.external_account_id,
      provider_content_id: row.providerContentId,
      source_timestamp: row.publishedAt,
      granted_metric_names: metricNames,
      source_snapshot_key: sourceSnapshotKey,
      published_at: row.publishedAt,
      period_start: row.metricPeriodStart ?? null,
      period_end: row.metricPeriodEnd ?? null,
      provider_payload_fingerprint: payloadFingerprint,
      content_type: row.contentType,
    });
    if (inserted.error) throw new Error("snapshot_persistence_failed");
    snapshotCount += 1;
  }

  return { contentCount, snapshotCount, observedMetrics: [...observedMetrics].sort() };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse(request);
  const rejected = rejectDisallowedOrigin(request);
  if (rejected) return rejected;
  if (request.method !== "POST") {
    return jsonResponse(request, { error: { code: "method_not_allowed" } }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return jsonResponse(request, { error: { code: "configuration_error" } }, 503);
  }

  const auth = createClient(url, anon, {
    global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await auth.auth.getUser();

  const configuredSchedulerSecret = Deno.env.get("CREATOR_SYNC_SCHEDULER_SECRET");
  const suppliedSchedulerSecret = request.headers.get("x-scheduler-secret");
  const scheduler =
    Boolean(configuredSchedulerSecret) &&
    suppliedSchedulerSecret === configuredSchedulerSecret;
  if (!user && !scheduler) {
    return jsonResponse(request, { error: { code: "unauthorized" } }, 401);
  }

  const input = await request.json().catch(() => ({}));
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const userId = user?.id ?? (typeof input.userId === "string" ? input.userId : null);
  if (!userId) return jsonResponse(request, { error: { code: "invalid_request" } }, 400);

  if (input.action === "delete") {
    if (typeof input.connectionId !== "string") {
      return jsonResponse(request, { error: { code: "invalid_request" } }, 400);
    }
    const deleted = await admin
      .from("creator_platform_connections")
      .delete()
      .eq("user_id", userId)
      .eq("id", input.connectionId);
    if (deleted.error) return jsonResponse(request, { error: { code: "delete_failed" } }, 500);
    return jsonResponse(request, { deleted: true });
  }

  if (input.action === "disconnect") {
    if (typeof input.connectionId !== "string") {
      return jsonResponse(request, { error: { code: "invalid_request" } }, 400);
    }
    const { data: row } = await admin
      .from("creator_platform_connections")
      .select("id")
      .eq("id", input.connectionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) return jsonResponse(request, { error: { code: "not_found" } }, 404);
    const credentials = await admin
      .from("creator_provider_credentials")
      .delete()
      .eq("connection_id", row.id);
    if (credentials.error) {
      return jsonResponse(request, { error: { code: "disconnect_failed" } }, 500);
    }
    const connection = await admin
      .from("creator_platform_connections")
      .update({
        status: "revoked",
        disconnected_at: new Date().toISOString(),
        next_allowed_at: null,
        safe_error_code: null,
      })
      .eq("id", row.id);
    if (connection.error) {
      return jsonResponse(request, { error: { code: "disconnect_failed" } }, 500);
    }
    return jsonResponse(request, { status: "revoked", historyRetained: true });
  }

  let connectionQuery = admin
    .from("creator_platform_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "connected");
  if (typeof input.connectionId === "string") {
    connectionQuery = connectionQuery.eq("id", input.connectionId);
  }
  const { data: connections, error: connectionError } = await connectionQuery;
  if (connectionError) {
    return jsonResponse(request, { error: { code: "connection_lookup_failed" } }, 500);
  }

  let synced = 0;
  let snapshots = 0;
  let content = 0;
  for (const raw of connections ?? []) {
    const connection = raw as CreatorConnection;
    if (connection.next_allowed_at && Date.parse(connection.next_allowed_at) > Date.now()) continue;
    if (!["youtube", "tiktok"].includes(connection.platform)) continue;

    const now = new Date().toISOString();
    await admin
      .from("creator_platform_connections")
      .update({
        last_attempt_at: now,
        next_allowed_at: new Date(Date.now() + SYNC_COOLDOWN_MS).toISOString(),
      })
      .eq("id", connection.id);

    const { data: credential } = await admin
      .from("creator_provider_credentials")
      .select("access_token_ciphertext,refresh_token_ciphertext,expires_at,scopes")
      .eq("connection_id", connection.id)
      .maybeSingle();
    if (!credential) {
      await admin
        .from("creator_platform_connections")
        .update({ status: "expired", safe_error_code: "credential_expired" })
        .eq("id", connection.id);
      continue;
    }

    try {
      const resolved = await resolveProviderAccess(admin, connection, credential);
      const scopes = resolved.scopes;
      if (
        (connection.platform === "youtube" &&
          (!scopes.includes(YOUTUBE_READ_SCOPE) || !scopes.includes(YOUTUBE_ANALYTICS_SCOPE))) ||
        (connection.platform === "tiktok" && !scopes.includes(TIKTOK_VIDEO_SCOPE))
      ) {
        await admin
          .from("creator_platform_connections")
          .update({ safe_error_code: "insufficient_scope" })
          .eq("id", connection.id);
        continue;
      }
      const rows =
        connection.platform === "youtube"
          ? await youtubeSync(resolved.access)
          : await tiktokSync(resolved.access);
      const persisted = await persistProviderRows(admin, connection, rows);
      const updated = await admin
        .from("creator_platform_connections")
        .update({
          last_success_at: now,
          safe_error_code: null,
          status: "connected",
          granted_metrics: persisted.observedMetrics,
          next_allowed_at: new Date(Date.now() + SYNC_COOLDOWN_MS).toISOString(),
        })
        .eq("id", connection.id);
      if (updated.error) throw new Error("connection_update_failed");
      synced += 1;
      snapshots += persisted.snapshotCount;
      content += persisted.contentCount;
    } catch (error) {
      const providerStatus = Number((error as { providerStatus?: unknown }).providerStatus);
      const safeCode = Number.isFinite(providerStatus)
        ? safeProviderError(providerStatus)
        : String((error as Error)?.message || "provider_request_failed").slice(0, 80);
      await admin
        .from("creator_platform_connections")
        .update({
          safe_error_code: safeCode,
          status: providerStatus === 401 ? "expired" : "error",
        })
        .eq("id", connection.id);
    }
  }

  return jsonResponse(request, { synced, snapshots, content });
});
