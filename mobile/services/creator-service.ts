import { supabase } from "@/lib/supabase";
import type {
  CreatorAnalyticsSnapshot,
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
    .select("platform,captured_at,metrics,country,weekday,hour,content_type")
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
  }));
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
  const { error } = await supabase
    .from("creator_goals")
    .upsert(
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
