import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { CREATOR_METRICS } from "@/lib/creator";
import type { CreatorContent, CreatorProfile, CreatorStrategy } from "@/lib/creator";
import { TaskService } from "@/services/workspace-services";

// The checked-in generated Database type predates canonical Creator migrations 001–006.
// This remains the same Supabase client and the same public schema; it is not Web storage.
const db: SupabaseClient = supabase;
const strings = (value: unknown) => (Array.isArray(value) ? value.map(String) : []);
const text = (value: unknown) => (typeof value === "string" ? value : "");
const number = (value: unknown) => (typeof value === "number" ? value : 0);

export const emptyCreatorProfile: CreatorProfile = {
  experience: "beginner",
  platforms: [],
  niche: "",
  goal: "build_brand",
  primaryAudienceRegion: "",
  weeklyPostingCapacity: 1,
  displayName: "",
  usernameIdeas: [],
  bio: "",
  positioning: "",
  category: "",
  callToAction: "",
  contentPillars: [],
  keywords: [],
  brandTone: "",
  visualDirection: "",
};

export async function loadCreatorProfile(userId: string): Promise<CreatorProfile | null> {
  const { data, error } = await db
    .from("creator_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    experience: text(data.experience),
    platforms: strings(data.platforms),
    niche: text(data.niche),
    goal: text(data.goal),
    primaryAudienceRegion: text(data.primary_audience_region),
    weeklyPostingCapacity: number(data.weekly_posting_capacity),
    displayName: text(data.display_name),
    usernameIdeas: strings(data.username_ideas),
    bio: text(data.bio),
    positioning: text(data.positioning),
    category: text(data.category),
    callToAction: text(data.call_to_action),
    contentPillars: strings(data.content_pillars),
    keywords: strings(data.keywords),
    brandTone: text(data.brand_tone),
    visualDirection: text(data.visual_direction),
  };
}

export async function saveCreatorProfile(userId: string, value: CreatorProfile) {
  const { error } = await db.from("creator_profiles").upsert(
    {
      user_id: userId,
      experience: value.experience,
      platforms: value.platforms,
      niche: value.niche.trim(),
      goal: value.goal,
      primary_audience_region: value.primaryAudienceRegion.trim(),
      weekly_posting_capacity: value.weeklyPostingCapacity,
      display_name: value.displayName.trim(),
      username_ideas: value.usernameIdeas,
      bio: value.bio.trim(),
      positioning: value.positioning.trim(),
      category: value.category.trim(),
      call_to_action: value.callToAction.trim(),
      content_pillars: value.contentPillars,
      keywords: value.keywords,
      brand_tone: value.brandTone.trim(),
      visual_direction: value.visualDirection.trim(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function loadCreatorStrategy(userId: string): Promise<CreatorStrategy | null> {
  const { data, error } = await db
    .from("creator_strategies")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        platform: text(data.platform),
        niche: text(data.niche),
        goal: text(data.goal),
        publishingFrequency: number(data.publishing_frequency),
        targetMarkets: strings(data.target_markets),
        preferredContentFormats: strings(data.preferred_content_formats),
        contentPillars: strings(data.content_pillars),
      }
    : null;
}

export async function saveCreatorStrategy(userId: string, value: CreatorStrategy) {
  const { error } = await db.from("creator_strategies").upsert(
    {
      user_id: userId,
      platform: value.platform,
      niche: value.niche.trim(),
      goal: value.goal,
      publishing_frequency: value.publishingFrequency,
      target_markets: value.targetMarkets,
      preferred_content_formats: value.preferredContentFormats,
      content_pillars: value.contentPillars,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function listCreatorResources(userId: string) {
  const tables = [
    "creator_learning_progress",
    "creator_goals",
    "creator_content_log",
    "creator_manual_metric_snapshots",
    "creator_manual_country_observations",
    "creator_analytics_snapshots",
    "creator_country_observations",
    "creator_platform_connections",
    "creator_projects",
    "creator_jobs",
    "creator_clips",
  ] as const;
  const results = await Promise.all(
    tables.map(async (table) => {
      const { data, error } = await db.from(table).select("*").eq("user_id", userId);
      if (error) throw error;
      return [table, data ?? []] as const;
    }),
  );
  return Object.fromEntries(results) as Record<(typeof tables)[number], Record<string, unknown>[]>;
}

export async function setLessonCompletion(userId: string, lessonKey: string, completed: boolean) {
  const query = db.from("creator_learning_progress");
  const { error } = completed
    ? await query.upsert(
        { user_id: userId, lesson_key: lessonKey },
        { onConflict: "user_id,lesson_key" },
      )
    : await query.delete().eq("lesson_key", lessonKey).eq("user_id", userId);
  if (error) throw error;
}

export async function saveCreatorGoal(userId: string, title: string, milestones: string[]) {
  const { error } = await db
    .from("creator_goals")
    .insert({ user_id: userId, title: title.trim(), milestones });
  if (error) throw error;
}

export async function deleteCreatorGoal(userId: string, goalId: string) {
  const { error } = await db.from("creator_goals").delete().eq("id", goalId).eq("user_id", userId);
  if (error) throw error;
}

export async function saveCreatorContent(userId: string, content: CreatorContent) {
  const { data, error } = await db
    .from("creator_content_log")
    .upsert({
      ...(content.id ? { id: content.id } : {}),
      user_id: userId,
      platform: content.platform,
      content_type: content.contentType,
      title: content.title.trim(),
      published_at: content.publishedAt,
      timezone: content.timezone,
      reference_url: content.referenceUrl?.trim() || null,
      content_pillar: content.contentPillar?.trim() || null,
      duration_ms: content.durationMs ?? null,
      notes: content.notes?.trim() || null,
      source_type: "manual",
      entered_by_user: true,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCreatorContent(userId: string, contentId: string) {
  const { error } = await db
    .from("creator_content_log")
    .delete()
    .eq("id", contentId)
    .eq("user_id", userId);
  if (error) throw error;
}

export function nullableMetricValues(values: Record<string, string>) {
  return Object.fromEntries(
    CREATOR_METRICS.map((metric) => [
      metric,
      values[metric] === "" ? null : Number(values[metric]),
    ]),
  );
}

export async function appendCreatorMetricSnapshot(
  userId: string,
  content: Record<string, unknown>,
  values: Record<string, string>,
) {
  const { error } = await db.from("creator_manual_metric_snapshots").insert({
    user_id: userId,
    content_id: content.id,
    platform: content.platform,
    ...nullableMetricValues(values),
    source_type: "manual",
    entered_by_user: true,
  });
  if (error) throw error;
}

export async function saveCreatorCountry(userId: string, value: Record<string, string>) {
  const { error } = await db.from("creator_manual_country_observations").insert({
    user_id: userId,
    platform: value.platform,
    country_iso: value.countryIso?.toUpperCase() || null,
    country_name: value.countryName.trim(),
    metric_context: value.metricContext.trim(),
    value: Number(value.value),
    period: value.period.trim(),
    notes: value.notes?.trim() || null,
    source_type: "manual",
    entered_by_user: true,
  });
  if (error) throw error;
}

export async function createCreatorTask(title: string) {
  await TaskService.createTask(title.trim());
}

export async function createCreatorVideoProject(input: {
  userId: string;
  title: string;
  file: File;
}) {
  const { data: project, error } = await db
    .from("creator_projects")
    .insert({
      user_id: input.userId,
      title: input.title.trim(),
      source_type: "local_video",
      source_status: "uploading",
      aspect_ratio: "9:16",
      target_duration_seconds: 30,
      captions_enabled: true,
      status: "draft",
    })
    .select("id")
    .single();
  if (error) throw error;
  const fileName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${input.userId}/${project.id}/source/${fileName}`;
  const uploaded = await supabase.storage.from("creator-sources").upload(path, input.file);
  if (uploaded.error) throw uploaded.error;
  const updated = await db
    .from("creator_projects")
    .update({
      source_reference: null,
      source_path: path,
      source_file_name: fileName,
      source_content_type: input.file.type,
      source_size_bytes: input.file.size,
      source_uploaded_at: new Date().toISOString(),
      source_status: "available",
      status: "ready",
      updated_at: new Date().toISOString(),
    })
    .eq("id", project.id)
    .eq("user_id", input.userId);
  if (updated.error) throw updated.error;
  const queued = await db.rpc("enqueue_creator_job", { p_project_id: project.id });
  if (queued.error) throw queued.error;
}

export async function signedCreatorOutput(path: string) {
  const { data, error } = await supabase.storage.from("creator-outputs").createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}
