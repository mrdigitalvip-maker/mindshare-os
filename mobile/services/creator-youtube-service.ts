import { supabase } from "@/lib/supabase";

export type CreatorYouTubeMetadata = {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
};

export async function fetchCreatorYouTubeMetadata(url: string): Promise<CreatorYouTubeMetadata> {
  const value = url.trim();
  if (!value) throw new Error("youtube_url_required");
  const { data, error } = await supabase.functions.invoke("creator-youtube-metadata", {
    body: { url: value },
  });
  if (error) throw error;
  if (!data || typeof data !== "object") throw new Error("invalid_youtube_metadata");
  const result = data as Partial<CreatorYouTubeMetadata> & { error?: string };
  if (result.error) throw new Error(result.error);
  if (
    typeof result.videoId !== "string" ||
    typeof result.title !== "string" ||
    typeof result.channelTitle !== "string" ||
    typeof result.publishedAt !== "string"
  )
    throw new Error("invalid_youtube_metadata");
  return {
    videoId: result.videoId,
    title: result.title,
    channelTitle: result.channelTitle,
    publishedAt: result.publishedAt,
    thumbnailUrl: typeof result.thumbnailUrl === "string" ? result.thumbnailUrl : null,
    durationSeconds: typeof result.durationSeconds === "number" ? result.durationSeconds : null,
  };
}
