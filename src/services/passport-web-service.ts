import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// The checked-in web Database snapshot predates the Passport migrations. Keep
// the rest of the web app strongly typed while this service talks to the live
// public schema that is already used by the native app.
const passportDb = supabase as unknown as SupabaseClient;

export type WebPassportTrack = {
  id: string;
  slug: string;
  title: string;
  description: string;
};

export type WebPassportProfile = {
  id: string;
  trackId: string;
  goal: "travel" | "work" | "study" | "conversation" | "culture";
  dailyMinutes: number;
  currentLevel: string;
  placementScore: number | null;
  planHorizonDays: number;
  travelDate: string | null;
};

export type WebPassportLesson = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedMinutes: number;
  status: string;
  content: Record<string, unknown>;
};

export type WebPlacementQuestion = {
  key: string;
  prompt: string;
  options: string[];
  difficulty: string;
  orderIndex: number;
};

export type WebVocabularyItem = {
  id: string;
  term: string;
  translation: string;
  context: string;
  stage: string;
  nextReviewAt: string;
};

export type WebPassportRetentionSummary = {
  currentStreak: number;
  longestStreak: number;
  activeDaysLast7: number;
  activeToday: boolean;
  lastActiveDate: string | null;
};

export type WebPassportMission = {
  id: string;
  title: string;
  prompt: string;
  missionType: string;
  status: "pending" | "completed" | "skipped";
};

export type WebRoleplayEntry = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type WebRoleplaySession = {
  id: string;
  scenario: string;
  status: string;
  transcript: WebRoleplayEntry[];
};

const requireUser = (value: string) => {
  const userId = value.trim();
  if (!userId) throw new Error("Authenticated user required.");
  return userId;
};

const localDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const vocabularyFrom = (value: unknown): WebVocabularyItem => {
  const row = record(value);
  return {
    id: String(row.id),
    term: String(row.term),
    translation: String(row.translation ?? ""),
    context: String(row.context ?? ""),
    stage: String(row.stage ?? "new"),
    nextReviewAt: String(row.next_review_at ?? ""),
  };
};

export async function listWebPassportTracks(): Promise<WebPassportTrack[]> {
  const { data, error } = await passportDb
    .from("studio_tracks")
    .select("id,slug,title,description")
    .eq("category", "language")
    .eq("active", true)
    .order("title", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((value) => {
    const row = record(value);
    return {
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      description: String(row.description ?? ""),
    };
  });
}

export async function getWebPassportProfile(userId: string): Promise<WebPassportProfile | null> {
  requireUser(userId);
  const { data, error } = await passportDb
    .from("passport_profiles")
    .select(
      "id,track_id,goal,travel_date,daily_minutes,current_level,placement_score,plan_horizon_days,is_primary,updated_at",
    )
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = record(data);
  return {
    id: String(row.id),
    trackId: String(row.track_id),
    goal: String(row.goal) as WebPassportProfile["goal"],
    travelDate: typeof row.travel_date === "string" ? row.travel_date : null,
    dailyMinutes: Number(row.daily_minutes ?? 15),
    currentLevel: String(row.current_level ?? "A0"),
    placementScore: row.placement_score == null ? null : Number(row.placement_score),
    planHorizonDays: Number(row.plan_horizon_days ?? 90),
  };
}

export async function getWebPassportRetentionSummary(
  userId: string,
  trackId: string,
): Promise<WebPassportRetentionSummary> {
  requireUser(userId);
  if (!trackId.trim()) throw new Error("Language track required.");
  const { data, error } = await passportDb.rpc("get_passport_retention_summary", {
    p_track_id: trackId,
  });
  if (error) throw error;
  const row = record(data);
  return {
    currentStreak: Math.max(0, Number(row.currentStreak ?? 0)),
    longestStreak: Math.max(0, Number(row.longestStreak ?? 0)),
    activeDaysLast7: Math.max(0, Math.min(7, Number(row.activeDaysLast7 ?? 0))),
    activeToday: row.activeToday === true,
    lastActiveDate: typeof row.lastActiveDate === "string" ? row.lastActiveDate : null,
  };
}

export async function saveWebPassportProfile(
  userId: string,
  input: {
    trackId: string;
    goal: WebPassportProfile["goal"];
    dailyMinutes: number;
    planHorizonDays: number;
    travelDate?: string | null;
    nativeLocale?: string | null;
  },
) {
  requireUser(userId);
  const { data, error } = await passportDb.rpc("upsert_passport_profile", {
    p_track_id: input.trackId,
    p_goal: input.goal,
    p_native_locale: input.nativeLocale ?? null,
    p_travel_date: input.travelDate ?? null,
    p_daily_minutes: input.dailyMinutes,
    p_plan_horizon_days: input.planHorizonDays,
    p_is_primary: true,
  });
  if (error) throw error;
  return data;
}

export async function listWebPassportLessons(
  userId: string,
  trackId: string,
): Promise<WebPassportLesson[]> {
  requireUser(userId);
  const { data: lessons, error } = await passportDb
    .from("studio_lessons")
    .select("id,title,description,difficulty,estimated_minutes,content,order_index")
    .eq("track_id", trackId)
    .eq("active", true)
    .order("order_index", { ascending: true });
  if (error) throw error;
  if (!lessons?.length) return [];

  const lessonRows = lessons.map(record);
  const ids = lessonRows.map((item) => String(item.id));
  const { data: progress, error: progressError } = await passportDb
    .from("studio_progress")
    .select("lesson_id,status")
    .eq("user_id", userId)
    .in("lesson_id", ids);
  if (progressError) throw progressError;
  const states = new Map(
    (progress ?? []).map((value) => {
      const item = record(value);
      return [String(item.lesson_id), String(item.status)];
    }),
  );

  return lessonRows.map((item) => ({
    id: String(item.id),
    title: String(item.title),
    description: String(item.description ?? ""),
    difficulty: String(item.difficulty ?? "A0"),
    estimatedMinutes: Number(item.estimated_minutes ?? 0),
    status: states.get(String(item.id)) ?? "not_started",
    content: record(item.content),
  }));
}

export async function completeWebPassportLesson(userId: string, lessonId: string) {
  requireUser(userId);
  const { data, error } = await passportDb.rpc("complete_studio_lesson", {
    p_lesson_id: lessonId,
    p_score: 100,
  });
  if (error) throw error;
  return data;
}

export async function listWebPlacementQuestions(
  userId: string,
  trackId: string,
): Promise<WebPlacementQuestion[]> {
  requireUser(userId);
  const { data, error } = await passportDb.rpc("get_passport_placement_questions", {
    p_track_id: trackId,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : [])
    .map((value) => record(value))
    .map((row) => ({
      key: String(row.key),
      prompt: String(row.prompt),
      options: Array.isArray(row.options) ? row.options.map(String) : [],
      difficulty: String(row.difficulty ?? "A0"),
      orderIndex: Number(row.orderIndex ?? 0),
    }))
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function submitWebPlacement(
  userId: string,
  trackId: string,
  answers: Record<string, number>,
) {
  requireUser(userId);
  const { data, error } = await passportDb.rpc("submit_passport_placement", {
    p_track_id: trackId,
    p_answers: answers,
  });
  if (error) throw error;
  return record(data);
}

export async function listWebDueVocabulary(
  userId: string,
  trackId: string,
): Promise<WebVocabularyItem[]> {
  requireUser(userId);
  const { data, error } = await passportDb
    .from("passport_vocabulary")
    .select("id,term,translation,context,stage,next_review_at")
    .eq("user_id", userId)
    .eq("track_id", trackId)
    .neq("stage", "mastered")
    .lte("next_review_at", new Date().toISOString())
    .order("next_review_at", { ascending: true })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map(vocabularyFrom);
}

export async function addWebPassportVocabulary(
  userId: string,
  trackId: string,
  input: { term: string; translation?: string; context?: string },
): Promise<WebVocabularyItem> {
  const uid = requireUser(userId);
  const languageTrackId = trackId.trim();
  const term = input.term.trim();
  if (!languageTrackId) throw new Error("Language track required.");
  if (!term || term.length > 160) throw new Error("Vocabulary term must be between 1 and 160 characters.");

  const { data, error } = await passportDb
    .from("passport_vocabulary")
    .insert({
      user_id: uid,
      track_id: languageTrackId,
      term,
      translation: input.translation?.trim() ?? "",
      context: input.context?.trim() ?? "",
    })
    .select("id,term,translation,context,stage,next_review_at")
    .single();
  if (error) throw error;
  return vocabularyFrom(data);
}

export async function reviewWebVocabulary(userId: string, vocabularyId: string, grade: number) {
  requireUser(userId);
  const { data, error } = await passportDb.rpc("review_passport_vocabulary", {
    p_vocabulary_id: vocabularyId,
    p_grade: grade,
  });
  if (error) throw error;
  return data;
}

export async function listWebPassportMissions(
  userId: string,
  trackId: string,
  locale: "pt-BR" | "en" = "pt-BR",
): Promise<WebPassportMission[]> {
  requireUser(userId);
  const missionDate = localDateKey();
  const { error: ensureError } = await passportDb.rpc("ensure_passport_daily_missions", {
    p_track_id: trackId,
    p_mission_date: missionDate,
    p_locale: locale,
  });
  if (ensureError) throw ensureError;

  const { data, error } = await passportDb
    .from("passport_daily_missions")
    .select("id,title,prompt,mission_type,status")
    .eq("user_id", userId)
    .eq("track_id", trackId)
    .eq("mission_date", missionDate)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((value) => {
    const row = record(value);
    return {
      id: String(row.id),
      title: String(row.title),
      prompt: String(row.prompt ?? ""),
      missionType: String(row.mission_type ?? ""),
      status: String(row.status) as WebPassportMission["status"],
    };
  });
}

export async function updateWebPassportMission(
  userId: string,
  missionId: string,
  status: "completed" | "skipped",
) {
  requireUser(userId);
  const now = new Date().toISOString();
  const { data, error } = await passportDb
    .from("passport_daily_missions")
    .update({ status, completed_at: status === "completed" ? now : null, updated_at: now })
    .eq("id", missionId)
    .eq("user_id", userId)
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function listWebRoleplaySessions(
  userId: string,
  trackId: string,
): Promise<WebRoleplaySession[]> {
  requireUser(userId);
  const { data, error } = await passportDb
    .from("passport_roleplay_sessions")
    .select("id,scenario,status,transcript,started_at")
    .eq("user_id", userId)
    .eq("track_id", trackId)
    .order("started_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []).map((value) => {
    const row = record(value);
    const transcript = Array.isArray(row.transcript)
      ? row.transcript
          .map((entry) => record(entry))
          .map((entry) => ({
            role: entry.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: String(entry.content ?? ""),
            createdAt: String(entry.createdAt ?? ""),
          }))
          .filter((entry) => entry.content)
      : [];
    return {
      id: String(row.id),
      scenario: String(row.scenario),
      status: String(row.status),
      transcript,
    };
  });
}

export async function startWebRoleplay(userId: string, trackId: string, scenario: string) {
  requireUser(userId);
  const { data, error } = await passportDb
    .from("passport_roleplay_sessions")
    .insert({ user_id: userId, track_id: trackId, scenario, mode: "text" })
    .select("id,scenario,status,transcript")
    .single();
  if (error) throw error;
  return record(data);
}

export async function sendWebRoleplayMessage(userId: string, sessionId: string, message: string) {
  requireUser(userId);
  const { data: authData, error: authError } = await supabase.auth.getSession();
  if (authError || !authData.session?.access_token) throw authError ?? new Error("Session required.");
  const { data, error } = await supabase.functions.invoke("passport-roleplay", {
    body: { sessionId, message: message.trim() },
    headers: { Authorization: `Bearer ${authData.session.access_token}` },
  });
  if (error) throw error;
  const envelope = record(data);
  if (envelope.ok !== true) throw new Error("Role-play response failed.");
  return record(envelope.data);
}

export async function finishWebRoleplay(userId: string, sessionId: string) {
  requireUser(userId);
  const now = new Date().toISOString();
  const { error } = await passportDb
    .from("passport_roleplay_sessions")
    .update({ status: "completed", completed_at: now, updated_at: now })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) throw error;
}
