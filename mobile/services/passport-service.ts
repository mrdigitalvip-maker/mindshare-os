import {
  type PassportLanguageTrack,
  type PassportLesson,
  type PassportPlacementQuestion,
  type PassportPlacementResult,
  type PassportProfile,
  type PassportVocabularyItem,
} from "@/lib/passport";
import { workspaceMutationError } from "@/lib/mutation-errors";
import { supabase } from "@/lib/supabase";

const requireUser = (userId: string) => {
  const value = userId.trim();
  if (!value) throw workspaceMutationError(new Error("Authenticated user required."));
  return value;
};

const languageTrackFrom = (row: Record<string, unknown>): PassportLanguageTrack => ({
  id: String(row.id),
  slug: String(row.slug),
  title: String(row.title),
  description: String(row.description ?? ""),
});

const profileFrom = (row: Record<string, unknown>): PassportProfile => ({
  id: String(row.id),
  userId: String(row.user_id),
  trackId: String(row.track_id),
  nativeLocale: typeof row.native_locale === "string" ? row.native_locale : null,
  goal: String(row.goal) as PassportProfile["goal"],
  travelDate: typeof row.travel_date === "string" ? row.travel_date : null,
  dailyMinutes: Number(row.daily_minutes),
  currentLevel: String(row.current_level) as PassportProfile["currentLevel"],
  placementScore: row.placement_score == null ? null : Number(row.placement_score),
  planHorizonDays: Number(row.plan_horizon_days),
  isPrimary: Boolean(row.is_primary),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

const lessonFrom = (
  row: Record<string, unknown>,
  progress?: Record<string, unknown>,
): PassportLesson => ({
  id: String(row.id),
  trackId: String(row.track_id),
  slug: String(row.slug),
  title: String(row.title),
  description: String(row.description ?? ""),
  content:
    row.content && typeof row.content === "object" && !Array.isArray(row.content)
      ? (row.content as Record<string, unknown>)
      : {},
  lessonType: String(row.lesson_type),
  difficulty: String(row.difficulty),
  orderIndex: Number(row.order_index),
  estimatedMinutes: Number(row.estimated_minutes),
  premium: Boolean(row.premium),
  status: progress
    ? (String(progress.status) as PassportLesson["status"])
    : "not_started",
  score: progress?.score == null ? null : Number(progress.score),
  xp: Number(progress?.xp ?? 0),
  completedAt:
    typeof progress?.completed_at === "string" ? progress.completed_at : null,
});

export type UpsertPassportProfileInput = {
  trackId: string;
  goal: PassportProfile["goal"];
  nativeLocale?: string | null;
  travelDate?: string | null;
  dailyMinutes?: number;
  planHorizonDays?: number;
  isPrimary?: boolean;
};

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

export async function listPassportProfiles(userId: string): Promise<PassportProfile[]> {
  const { data, error } = await supabase
    .from("passport_profiles")
    .select(
      "id,user_id,track_id,native_locale,goal,travel_date,daily_minutes,current_level,placement_score,plan_horizon_days,is_primary,created_at,updated_at",
    )
    .eq("user_id", requireUser(userId))
    .order("is_primary", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw workspaceMutationError(error);
  return (data ?? []).map((row) => profileFrom(row as Record<string, unknown>));
}

export async function upsertPassportProfile(
  userId: string,
  input: UpsertPassportProfileInput,
): Promise<PassportProfile> {
  requireUser(userId);
  const trackId = input.trackId.trim();
  if (!trackId) throw workspaceMutationError(new Error("Language track required."));

  const { data, error } = await supabase.rpc("upsert_passport_profile", {
    p_track_id: trackId,
    p_goal: input.goal,
    p_native_locale: input.nativeLocale?.trim() || null,
    p_travel_date: input.travelDate ?? null,
    p_daily_minutes: input.dailyMinutes ?? 15,
    p_plan_horizon_days: input.planHorizonDays ?? 90,
    p_is_primary: input.isPrimary ?? true,
  } as never);

  if (error) throw workspaceMutationError(error);
  return profileFrom(data as unknown as Record<string, unknown>);
}

export async function listPassportLessons(
  userId: string,
  trackId: string,
): Promise<PassportLesson[]> {
  const uid = requireUser(userId);
  const languageTrackId = trackId.trim();
  if (!languageTrackId) throw workspaceMutationError(new Error("Language track required."));

  const { data: lessons, error: lessonsError } = await supabase
    .from("studio_lessons")
    .select(
      "id,track_id,slug,title,description,content,lesson_type,difficulty,order_index,estimated_minutes,premium",
    )
    .eq("track_id", languageTrackId)
    .eq("active", true)
    .order("order_index", { ascending: true });

  if (lessonsError) throw workspaceMutationError(lessonsError);
  if (!lessons?.length) return [];

  const lessonIds = lessons.map((lesson) => String(lesson.id));
  const { data: progressRows, error: progressError } = await supabase
    .from("studio_progress")
    .select("lesson_id,status,score,xp,completed_at")
    .eq("user_id", uid)
    .in("lesson_id", lessonIds);

  if (progressError) throw workspaceMutationError(progressError);

  const progressByLesson = new Map(
    (progressRows ?? []).map((row) => [
      String(row.lesson_id),
      row as Record<string, unknown>,
    ]),
  );

  return lessons.map((lesson) =>
    lessonFrom(
      lesson as Record<string, unknown>,
      progressByLesson.get(String(lesson.id)),
    ),
  );
}

export async function completePassportLesson(
  userId: string,
  lessonId: string,
  score = 100,
): Promise<{ xp: number; streak: number; date: string }> {
  requireUser(userId);
  const id = lessonId.trim();
  if (!id) throw workspaceMutationError(new Error("Lesson required."));
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw workspaceMutationError(new Error("Score must be between 0 and 100."));
  }

  const { data, error } = await supabase.rpc("complete_studio_lesson", {
    p_lesson_id: id,
    p_score: Math.round(score),
  } as never);

  if (error) throw workspaceMutationError(error);
  const result = (data ?? {}) as Record<string, unknown>;
  return {
    xp: Number(result.xp ?? 0),
    streak: Number(result.streak ?? 0),
    date: String(result.date ?? ""),
  };
}

export async function listPassportPlacementQuestions(
  userId: string,
  trackId: string,
): Promise<PassportPlacementQuestion[]> {
  requireUser(userId);
  const languageTrackId = trackId.trim();
  if (!languageTrackId) throw workspaceMutationError(new Error("Language track required."));

  const { data, error } = await supabase.rpc("get_passport_placement_questions", {
    p_track_id: languageTrackId,
  } as never);

  if (error) throw workspaceMutationError(error);

  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => {
    const value = row as Record<string, unknown>;
    return {
      key: String(value.key),
      prompt: String(value.prompt),
      options: Array.isArray(value.options) ? value.options.map((option) => String(option)) : [],
      difficulty: String(value.difficulty) as PassportPlacementQuestion["difficulty"],
      orderIndex: Number(value.orderIndex ?? 0),
    };
  });
}

export async function submitPassportPlacement(
  userId: string,
  trackId: string,
  answers: Record<string, number>,
): Promise<PassportPlacementResult> {
  requireUser(userId);
  const languageTrackId = trackId.trim();
  if (!languageTrackId) throw workspaceMutationError(new Error("Language track required."));

  const entries = Object.entries(answers);
  if (!entries.length) throw workspaceMutationError(new Error("Placement answers required."));
  if (entries.some(([key, value]) => !key.trim() || !Number.isInteger(value) || value < 0)) {
    throw workspaceMutationError(new Error("Placement answers are invalid."));
  }

  const { data, error } = await supabase.rpc("submit_passport_placement", {
    p_track_id: languageTrackId,
    p_answers: answers,
  } as never);

  if (error) throw workspaceMutationError(error);
  const result = (data ?? {}) as Record<string, unknown>;
  return {
    score: Number(result.score ?? 0),
    level: String(result.level) as PassportPlacementResult["level"],
  };
}

export async function listPassportDueVocabulary(
  userId: string,
  trackId: string,
  limit = 20,
): Promise<PassportVocabularyItem[]> {
  const uid = requireUser(userId);
  const languageTrackId = trackId.trim();
  if (!languageTrackId) throw workspaceMutationError(new Error("Language track required."));
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw workspaceMutationError(new Error("Vocabulary review limit must be between 1 and 100."));
  }

  const { data, error } = await supabase
    .from("passport_vocabulary")
    .select(
      "id,track_id,source_lesson_id,term,translation,context,stage,ease_factor,interval_days,repetitions,next_review_at,last_reviewed_at",
    )
    .eq("user_id", uid)
    .eq("track_id", languageTrackId)
    .neq("stage", "mastered")
    .lte("next_review_at", new Date().toISOString())
    .order("next_review_at", { ascending: true })
    .limit(limit);

  if (error) throw workspaceMutationError(error);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    trackId: String(row.track_id),
    sourceLessonId: typeof row.source_lesson_id === "string" ? row.source_lesson_id : null,
    term: String(row.term),
    translation: String(row.translation ?? ""),
    context: String(row.context ?? ""),
    stage: String(row.stage) as PassportVocabularyItem["stage"],
    easeFactor: Number(row.ease_factor),
    intervalDays: Number(row.interval_days),
    repetitions: Number(row.repetitions),
    nextReviewAt: String(row.next_review_at),
    lastReviewedAt: typeof row.last_reviewed_at === "string" ? row.last_reviewed_at : null,
  }));
}
