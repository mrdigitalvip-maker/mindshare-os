import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, preflightResponse, rejectDisallowedOrigin } from "../_shared/http.ts";

const MAX_SOURCE_BYTES = 200 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
]);

function isPrivateIpv4(value: string) {
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff") ||
    normalized.startsWith("::ffff:")
  );
}

async function assertPublicHttpsUrl(url: URL) {
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("invalid_source_url");
  }
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost")) {
    throw new Error("unsafe_source_host");
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(":")) {
    throw new Error("unsafe_source_host");
  }
  const [ipv4, ipv6] = await Promise.all([
    Deno.resolveDns(host, "A").catch(() => [] as string[]),
    Deno.resolveDns(host, "AAAA").catch(() => [] as string[]),
  ]);
  if (!ipv4.length && !ipv6.length) throw new Error("source_host_unresolved");
  if (ipv4.some(isPrivateIpv4) || ipv6.some(isPrivateIpv6)) {
    throw new Error("unsafe_source_host");
  }
}

async function fetchSource(initial: URL) {
  let current = initial;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicHttpsUrl(current);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    let response: Response;
    try {
      response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        headers: {
          Accept: "video/mp4,video/webm,video/quicktime,video/x-m4v,video/*;q=0.8",
          "User-Agent": "KIVRYN-Creator-Source-Importer/1.0",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => undefined);
      if (!location || hop === MAX_REDIRECTS) throw new Error("source_redirect_rejected");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok || !response.body) throw new Error("source_fetch_failed");
    return { response, finalUrl: current };
  }
  throw new Error("source_redirect_rejected");
}

function extensionFor(contentType: string) {
  if (contentType === "video/webm") return ".webm";
  if (contentType === "video/quicktime") return ".mov";
  if (contentType === "video/x-m4v") return ".m4v";
  return ".mp4";
}

function safeFileName(url: URL, contentType: string) {
  const raw = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "source");
  const clean = raw.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
  const hasExtension = /\.[a-zA-Z0-9]{2,5}$/.test(clean);
  return `${clean || "source"}${hasExtension ? "" : extensionFor(contentType)}`;
}

function safeTitle(input: unknown, url: URL) {
  const requested = typeof input === "string" ? input.trim() : "";
  if (requested) return requested.slice(0, 120);
  const derived = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "Imported video")
    .replace(/\.[a-zA-Z0-9]{2,5}$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return (derived || "Imported video").slice(0, 120);
}

function storageObjectUrl(base: string, path: string) {
  return `${base}/storage/v1/object/creator-sources/${path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse(request);
  const rejected = rejectDisallowedOrigin(request);
  if (rejected) return rejected;
  if (request.method !== "POST") {
    return jsonResponse(request, { error: { code: "method_not_allowed" } }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = request.headers.get("Authorization") ?? "";
  if (!supabaseUrl || !anonKey) {
    return jsonResponse(request, { error: { code: "configuration_error" } }, 503);
  }

  const auth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return jsonResponse(request, { error: { code: "unauthorized" } }, 401);

  const input = await request.json().catch(() => ({}));
  const rawUrl = String(input.url ?? "").trim().slice(0, 2048);
  let requestedUrl: URL;
  try {
    requestedUrl = new URL(rawUrl);
    await assertPublicHttpsUrl(requestedUrl);
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_source_url";
    return jsonResponse(request, { error: { code } }, 400);
  }

  let fetched: Awaited<ReturnType<typeof fetchSource>>;
  try {
    fetched = await fetchSource(requestedUrl);
  } catch (error) {
    const code = error instanceof Error ? error.message : "source_fetch_failed";
    const status = code === "source_fetch_failed" ? 422 : 400;
    return jsonResponse(request, { error: { code } }, status);
  }

  const contentType = (fetched.response.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const size = Number(fetched.response.headers.get("content-length") ?? "0");
  if (!VIDEO_TYPES.has(contentType)) {
    await fetched.response.body?.cancel().catch(() => undefined);
    return jsonResponse(request, { error: { code: "unsupported_video_type" } }, 415);
  }
  if (!Number.isSafeInteger(size) || size <= 0) {
    await fetched.response.body?.cancel().catch(() => undefined);
    return jsonResponse(request, { error: { code: "source_size_unknown" } }, 422);
  }
  if (size > MAX_SOURCE_BYTES) {
    await fetched.response.body?.cancel().catch(() => undefined);
    return jsonResponse(
      request,
      { error: { code: "source_too_large", maxBytes: MAX_SOURCE_BYTES } },
      413,
    );
  }

  const title = safeTitle(input.title, fetched.finalUrl);
  const fileName = safeFileName(fetched.finalUrl, contentType);
  const sanitizedReference = `${fetched.finalUrl.origin}${fetched.finalUrl.pathname}`.slice(0, 2048);
  const aspectRatio = ["9:16", "1:1", "16:9"].includes(String(input.aspectRatio))
    ? String(input.aspectRatio)
    : "9:16";
  const targetDurationSeconds = [15, 20, 30, 45, 60].includes(Number(input.targetDurationSeconds))
    ? Number(input.targetDurationSeconds)
    : 30;
  const captionsEnabled = input.captionsEnabled !== false;

  const { data: project, error: projectError } = await auth
    .from("creator_projects")
    .insert({
      user_id: user.id,
      title,
      source_type: "authorized_direct",
      source_reference: sanitizedReference,
      source_status: "uploading",
      aspect_ratio: aspectRatio,
      target_duration_seconds: targetDurationSeconds,
      captions_enabled: captionsEnabled,
      status: "draft",
    })
    .select("id")
    .single();
  if (projectError || !project) {
    await fetched.response.body?.cancel().catch(() => undefined);
    const limited = projectError?.message?.includes("FREE_CREATION_LIMIT_REACHED");
    return jsonResponse(
      request,
      { error: { code: limited ? "creator_project_limit_reached" : "project_create_failed" } },
      limited ? 409 : 500,
    );
  }

  const path = `${user.id}/${project.id}/source/${fileName}`;
  const storageResponse = await fetch(storageObjectUrl(supabaseUrl, path), {
    method: "POST",
    headers: {
      Authorization: authorization,
      apikey: anonKey,
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Cache-Control": "3600",
      "x-upsert": "false",
    },
    body: fetched.response.body,
  }).catch(() => null);

  if (!storageResponse?.ok) {
    await auth
      .from("creator_projects")
      .update({ source_status: "failed", status: "failed", updated_at: new Date().toISOString() })
      .eq("id", project.id)
      .eq("user_id", user.id);
    console.error("creator_source_import_storage_failed", storageResponse?.status ?? 0);
    return jsonResponse(request, { error: { code: "storage_upload_failed" }, projectId: project.id }, 502);
  }

  const uploadedAt = new Date().toISOString();
  const { error: updateError } = await auth
    .from("creator_projects")
    .update({
      source_path: path,
      source_file_name: fileName,
      source_content_type: contentType,
      source_size_bytes: size,
      source_uploaded_at: uploadedAt,
      source_status: "available",
      status: "ready",
      updated_at: uploadedAt,
    })
    .eq("id", project.id)
    .eq("user_id", user.id);
  if (updateError) {
    console.error("creator_source_import_project_update_failed", updateError.code);
    return jsonResponse(request, { error: { code: "project_update_failed" }, projectId: project.id }, 500);
  }

  const { data: jobId, error: queueError } = await auth.rpc("enqueue_creator_job", {
    p_project_id: project.id,
  });
  if (queueError) {
    console.error("creator_source_import_queue_failed", queueError.code);
    return jsonResponse(
      request,
      { error: { code: "processing_queue_failed" }, projectId: project.id },
      500,
    );
  }

  return jsonResponse(
    request,
    {
      projectId: project.id,
      jobId,
      title,
      sourceType: "authorized_direct",
      contentType,
      sizeBytes: size,
      status: "queued",
    },
    201,
  );
});
