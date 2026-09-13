import { type PassportLanguageTrack } from "@/lib/passport";
import { workspaceMutationError } from "@/lib/mutation-errors";
import { supabase } from "@/lib/supabase";

const languageTrackFrom = (row: Record<string, unknown>): PassportLanguageTrack => ({
  id: String(row.id),
  slug: String(row.slug),
  title: String(row.title),
  description: String(row.description ?? ""),
});

export async function listPassportLanguageTracks(): Promise<PassportLanguageTrack[]> {
  const { data, error } = await supabase
    .from("studio_tracks")
    .select("id,slug,title,description")
    .eq("category", "language")
    .eq("active", true)
    .order("title", { ascending: true });

  if (error) throw workspaceMutationError(error);
  return (data ?? []).map((row) => languageTrackFrom(row as Record<string, unknown>));
}
