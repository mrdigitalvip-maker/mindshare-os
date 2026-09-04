import { supabase } from "@/lib/supabase";
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
