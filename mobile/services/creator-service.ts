import { supabase } from "@/lib/supabase";
import type { CreatorProfileDraft, CreatorStrategy } from "@/lib/creator";
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
  const { error } = await supabase.from("creator_profiles").upsert({
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
  });
  if (error) throw error;
}

export async function saveCreatorStrategy(userId: string, strategy: CreatorStrategy) {
  if (!userId.trim()) throw new Error("authentication_required");
  const { error } = await supabase.from("creator_strategies").insert({
    user_id: userId,
    platform: strategy.platform,
    niche: strategy.niche.trim(),
    goal: strategy.goal,
    content_pillars: strategy.contentPillars,
    publishing_frequency: strategy.publishingFrequency,
    target_markets: strategy.targetMarkets,
    preferred_content_formats: strategy.preferredContentFormats,
  });
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
