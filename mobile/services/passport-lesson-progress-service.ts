import { workspaceMutationError } from "@/lib/mutation-errors";
import { supabase } from "@/lib/supabase";

export async function startPassportLesson(userId: string, lessonId: string): Promise<void> {
  const uid = userId.trim();
  const id = lessonId.trim();
  if (!uid) throw workspaceMutationError(new Error("Authenticated user required."));
  if (!id) throw workspaceMutationError(new Error("Lesson required."));

  const now = new Date().toISOString();
  const { error } = await supabase.from("studio_progress").upsert(
    {
      user_id: uid,
      lesson_id: id,
      status: "in_progress",
      started_at: now,
      updated_at: now,
    } as never,
    { onConflict: "user_id,lesson_id", ignoreDuplicates: true },
  );

  if (error) throw workspaceMutationError(error);
}
