import { supabase } from "@/lib/supabase";
import type {
  CreatorAnalyticsSnapshot,
  CreatorPlatformConnection,
  CreatorGoal,
  CreatorProfileDraft,
  CreatorStrategy,
} from "@/lib/creator";
export type CreatorProject = {
  id: string;
  title: string;
  sourceType: string;
  sourceStatus: string;
  aspectRatio: string;
  captionsEnabled: boolean;
  status: string;
  createdAt: string;
};
export type CreatorJob = {
  id: string;
  status: string;
  progressStage: string | null;
  errorCode: string | null;
  cancellationRequestedAt: string | null;
};
export type CreatorClip = {
  id: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  rank: number;
  score: number;
  scoreReason: string;
  transcriptExcerpt: string;
  renderStatus: string;
  outputPath: string;
  aspectRatio: string;
  captionsEnabled: boolean;
};
const safeName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "source-video";
const fromRow = (row: Record<string, unknown>): CreatorProject => ({
  id: String(row.id),
  title: String(row.title),
  sourceType: String(row.source_type),
  sourceStatus: String(row.source_status),
  aspectRatio: String(row.aspect_ratio),
  captionsEnabled: row.captions_enabled === true,
  status: String(row.status),
  createdAt: String(row.created_at),
});
export async function listCreatorProjects(userId: string) {
  if (!userId.trim()) throw new Error("authentication_required");
  const { data, error } = await supabase
    .from("creator_projects")
    .select("id,title,source_type,source_status,aspect_ratio,captions_enabled,status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}
export async function getCreatorProject(userId: string, projectId: string) {
  if (!userId.trim() || !projectId.trim()) return null;
  const { data, error } = await supabase
    .from("creator_projects")
    .select("id,title,source_type,source_status,aspect_ratio,captions_enabled,status,created_at")
    .eq("user_id", userId)
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

export async function saveCreatorProfile(userId: string, profile: CreatorProfileDraft) {
  if (!userId.trim()) throw new Error("authentication_required");
  const { error } = await supabase.from("creator_profiles").upsert(
    {
      user_id: userId,
      experience: profile.experience,
      platforms: profile.platforms,
      niche: profile.niche.trim(),
      goal: profile.goal,
      primary_audience_region: profile.primaryAudienceRegion.trim(),
      weekly_posting_capacity: profile.weeklyPostingCapacity,
      display_name: profile.displayName.trim(),
      username_ideas: profile.usernameIdeas,
      bio: profile.bio.trim(),
      positioning: profile.positioning.trim(),
      category: profile.category.trim(),
      call_to_action: profile.callToAction.trim(),
      content_pillars: profile.contentPillars,
      keywords: profile.keywords,
      brand_tone: profile.brandTone.trim(),
      visual_direction: profile.visualDirection.trim(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function loadCreatorProfile(userId: string): Promise<CreatorProfileDraft | null> {
  if (!userId.trim()) return null;
  const { data, error } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    experience: data.experience,
    platforms: data.platforms ?? [],
    niche: data.niche,
    goal: data.goal,
    primaryAudienceRegion: data.primary_audience_region,
    weeklyPostingCapacity: data.weekly_posting_capacity,
    displayName: data.display_name,
    usernameIdeas: data.username_ideas ?? [],
    bio: data.bio,
    positioning: data.positioning,
    category: data.category,
    callToAction: data.call_to_action,
    contentPillars: data.content_pillars ?? [],
    keywords: data.keywords ?? [],
    brandTone: data.brand_tone,
    visualDirection: data.visual_direction,
  };
}

export async function saveCreatorStrategy(userId: string, strategy: CreatorStrategy) {
  if (!userId.trim()) throw new Error("authentication_required");
  const { error } = await supabase.from("creator_strategies").upsert(
    {
      user_id: userId,
      platform: strategy.platform,
      niche: strategy.niche.trim(),
      goal: strategy.goal,
      content_pillars: strategy.contentPillars,
      publishing_frequency: strategy.publishingFrequency,
      target_markets: strategy.targetMarkets,
      preferred_content_formats: strategy.preferredContentFormats,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function loadCreatorStrategy(userId: string): Promise<CreatorStrategy | null> {
  const { data, error } = await supabase
    .from("creator_strategies")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        platform: data.platform,
        niche: data.niche,
        goal: data.goal,
        contentPillars: data.content_pillars ?? [],
        publishingFrequency: data.publishing_frequency,
        targetMarkets: data.target_markets ?? [],
        preferredContentFormats: data.preferred_content_formats ?? [],
      }
    : null;
}

export async function setLessonCompletion(userId: string, lessonKey: string, completed: boolean) {
  const query = supabase.from("creator_learning_progress");
  const { error } = completed
    ? await query.upsert(
        { user_id: userId, lesson_key: lessonKey },
        { onConflict: "user_id,lesson_key" },
      )
    : await query.delete().eq("user_id", userId).eq("lesson_key", lessonKey);
  if (error) throw error;
}

export async function listCompletedLessons(userId: string) {
  const { data, error } = await supabase
    .from("creator_learning_progress")
    .select("lesson_key")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.lesson_key as string);
}

export async function listCreatorAnalytics(userId: string): Promise<CreatorAnalyticsSnapshot[]> {
  const { data, error } = await supabase
    .from("creator_analytics_snapshots")
    .select(
      "platform,captured_at,metrics,country,weekday,hour,content_type,provider_content_id,published_at,source_timestamp,granted_metric_names",
    )
    .eq("user_id", userId)
    .order("captured_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    platform: row.platform,
    capturedAt: row.captured_at,
    metrics: row.metrics ?? {},
    country: row.country ?? undefined,
    weekday: row.weekday ?? undefined,
    hour: row.hour ?? undefined,
    contentType: row.content_type ?? undefined,
    providerContentId: row.provider_content_id ?? undefined,
    publishedAt: row.published_at ?? undefined,
    sourceTimestamp: row.source_timestamp ?? undefined,
    grantedMetricNames: row.granted_metric_names ?? [],
  }));
}

export async function listCreatorConnections(userId: string): Promise<CreatorPlatformConnection[]> {
  const { data, error } = await supabase
    .from("creator_platform_connections")
    .select("id,platform,status,provider_display_name,last_success_at,granted_metrics")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    platform: row.platform,
    status: row.status,
    displayName: row.provider_display_name ?? undefined,
    lastSuccessAt: row.last_success_at ?? undefined,
    grantedMetrics: row.granted_metrics ?? [],
  }));
}
export async function startCreatorOAuth(
  provider: CreatorPlatformConnection["platform"],
  redirectUri: string,
) {
  const { data, error } = await supabase.functions.invoke("creator-oauth-start", {
    body: { provider, redirectUri },
  });
  if (error) throw error;
  return data as { authorizationUrl: string; status: "authorizing" };
}
export async function syncCreatorAnalytics() {
  const { data, error } = await supabase.functions.invoke("creator-analytics-sync", {
    body: { action: "sync" },
  });
  if (error) throw error;
  return data;
}
export async function disconnectCreatorConnection(connectionId: string) {
  const { data, error } = await supabase.functions.invoke("creator-analytics-sync", {
    body: { action: "disconnect", connectionId },
  });
  if (error) throw error;
  return data;
}
export async function deleteCreatorPlatformData(connectionId: string) {
  const { data, error } = await supabase.functions.invoke("creator-analytics-sync", {
    body: { action: "delete", connectionId },
  });
  if (error) throw error;
  return data;
}

export async function listCreatorGoals(userId: string): Promise<CreatorGoal[]> {
  const { data, error } = await supabase
    .from("creator_goals")
    .select("id,title,milestones")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as CreatorGoal[];
}

export async function saveCreatorGoal(
  userId: string,
  goal: Omit<CreatorGoal, "id"> & { id?: string },
) {
  const { error } = await supabase.from("creator_goals").upsert(
    {
      ...(goal.id ? { id: goal.id } : {}),
      user_id: userId,
      title: goal.title.trim(),
      milestones: goal.milestones,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function deleteCreatorProject(userId: string, projectId: string) {
  if (!userId.trim() || !projectId.trim()) throw new Error("authentication_required");
  const { error } = await supabase
    .from("creator_projects")
    .delete()
    .eq("user_id", userId)
    .eq("id", projectId);
  if (error) throw error;
}

/** Creates the canonical project first, then uploads to its private owner path.
 * Storage upload confirmation precedes the authoritative `available` transition.
 * Supabase's RN standard upload currently buffers the Blob; large-file resumability
 * requires tus-js-client, which is intentionally not claimed by this implementation. */
export async function createAndUploadCreatorVideo(input: {
  userId: string;
  title: string;
  uri: string;
  fileName: string;
  contentType: string;
  fileSize?: number;
  aspectRatio: "9:16" | "1:1" | "16:9";
  targetDuration: 15 | 20 | 30 | 45 | 60;
  captionsEnabled: boolean;
}) {
  if (!input.userId || !input.uri) throw new Error("source_required");
  const created = await supabase
    .from("creator_projects")
    .insert({
      user_id: input.userId,
      title: input.title.trim(),
      source_type: "local_video",
      source_status: "uploading",
      aspect_ratio: input.aspectRatio,
      target_duration_seconds: input.targetDuration,
      captions_enabled: input.captionsEnabled,
      status: "draft",
    })
    .select("id")
    .single();
  if (created.error) throw created.error;
  const projectId = created.data.id as string,
    path = `${input.userId}/${projectId}/source/${safeName(input.fileName)}`;
  try {
    const response = await fetch(input.uri);
    if (!response.ok) throw new Error("local_file_read_failed");
    const blob = await response.blob();
    const upload = await supabase.storage.from("creator-sources").upload(path, blob, {
      contentType: input.contentType || "application/octet-stream",
      upsert: false,
    });
    if (upload.error) throw upload.error;
    const ready = await supabase
      .from("creator_projects")
      .update({
        source_reference: null,
        source_path: path,
        source_file_name: safeName(input.fileName),
        source_content_type: input.contentType,
        source_size_bytes: input.fileSize ?? blob.size,
        source_uploaded_at: new Date().toISOString(),
        source_status: "available",
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("user_id", input.userId);
    if (ready.error) throw ready.error;
    return projectId;
  } catch (error) {
    await supabase
      .from("creator_projects")
      .update({ source_status: "failed", status: "failed", updated_at: new Date().toISOString() })
      .eq("id", projectId)
      .eq("user_id", input.userId);
    throw error;
  }
}
export async function enqueueCreatorProject(projectId: string) {
  const { data, error } = await supabase.rpc("enqueue_creator_job", { p_project_id: projectId });
  if (error) throw error;
  return String(data);
}
export async function getLatestCreatorJob(
  userId: string,
  projectId: string,
): Promise<CreatorJob | null> {
  const { data, error } = await supabase
    .from("creator_jobs")
    .select("id,status,progress_stage,error_code,cancellation_requested_at")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        id: data.id,
        status: data.status,
        progressStage: data.progress_stage,
        errorCode: data.error_code,
        cancellationRequestedAt: data.cancellation_requested_at,
      }
    : null;
}
export async function listCreatorClips(userId: string, projectId: string): Promise<CreatorClip[]> {
  const { data, error } = await supabase
    .from("creator_clips")
    .select(
      "id,start_ms,end_ms,duration_ms,rank,score,score_reason,transcript_excerpt,render_status,output_path,aspect_ratio,captions_enabled",
    )
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .eq("render_status", "available")
    .order("rank");
  if (error) throw error;
  return (data ?? []).map((x) => ({
    id: x.id,
    startMs: Number(x.start_ms),
    endMs: Number(x.end_ms),
    durationMs: Number(x.duration_ms),
    rank: Number(x.rank),
    score: Number(x.score),
    scoreReason: x.score_reason ?? "",
    transcriptExcerpt: x.transcript_excerpt ?? "",
    renderStatus: x.render_status,
    outputPath: x.output_path,
    aspectRatio: x.aspect_ratio,
    captionsEnabled: x.captions_enabled,
  }));
}
export async function createOutputSignedUrl(outputPath: string) {
  const { data, error } = await supabase.storage
    .from("creator-outputs")
    .createSignedUrl(outputPath, 300);
  if (error) throw error;
  return data.signedUrl;
}
export async function cancelCreatorJob(jobId: string) {
  const { error } = await supabase.rpc("cancel_creator_job", { p_job_id: jobId });
  if (error) throw error;
}
export async function requestClipRerender(
  clipId: string,
  settings: { startMs: number; endMs: number; aspectRatio: string; captionsEnabled: boolean },
) {
  const { data, error } = await supabase.rpc("enqueue_creator_rerender", {
    p_clip_id: clipId,
    p_start_ms: settings.startMs,
    p_end_ms: settings.endMs,
    p_aspect_ratio: settings.aspectRatio,
    p_captions: settings.captionsEnabled,
    p_caption_style: "clean",
  });
  if (error) throw error;
  return String(data);
}
