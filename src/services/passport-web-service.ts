import { supabase } from "@/lib/supabase";

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

export async function listWebPassportTracks(): Promise<WebPassportTrack[]> {
  const { data, error } = await supabase
    .from("studio_tracks")
    .select("id,slug,title,description")
    .eq("category", "language")
    .eq("active", true)
    .order("title", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: String(row.description ?? ""),
  }));
}

export async function getWebPassportProfile(userId: string): Promise<WebPassportProfile | null> {
  requireUser(userId);
  const { data, error } = await supabase
    .from("passport_profiles" as never)
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
  const { data, error } = await supabase.rpc("upsert_passport_profile" as never, {
    p_track_id: input.trackId,
    p_goal: input.goal,
    p_native_locale: input.nativeLocale ?? null,
    p_travel_date: input.travelDate ?? null,
    p_daily_minutes: input.dailyMinutes,
    p_plan_horizon_days: input.planHorizonDays,
    p_is_primary: true,
  } as never);
  if (error) throw error;
  return data;
}

export async function listWebPassportLessons(
  userId: string,
  trackId: string,
): Promise<WebPassportLesson[]> {
  requireUser(userId);
  const { data: lessons, error } = await supabase
    .from("studio_lessons")
    .select("id,title,description,difficulty,estimated_minutes,content,order_index")
    .eq("track_id", trackId)
    .eq("active", true)
    .order("order_index", { ascending: true });
  if (error) throw error;
  if (!lessons?.length) return [];

  const ids = lessons.map((item) => item.id);
  const { data: progress, error: progressError } = await supabase
    .from("studio_progress")
    .select("lesson_id,status")
    .eq("user_id", userId)
    .in("lesson_id", ids);
  if (progressError) throw progressError;
  const states = new Map((progress ?? []).map((item) => [String(item.lesson_id), String(item.status)]));

  return lessons.map((item) => ({
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
  const { data, error } = await supabase.rpc("complete_studio_lesson" as never, {
    p_lesson_id: lessonId,
    p_score: 100,
  } as never);
  if (error) throw error;
  return data;
}

export async function listWebPlacementQuestions(
  userId: string,
  trackId: string,
): Promise<WebPlacementQuestion[]> {
  requireUser(userId);
  const { data, error } = await supabase.rpc("get_passport_placement_questions" as never, {
    p_track_id: trackId,
  } as never);
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
  const { data, error } = await supabase.rpc("submit_passport_placement" as never, {
    p_track_id: trackId,
    p_answers: answers,
  } as never);
  if (error) throw error;
  return record(data);
}

export async function listWebDueVocabulary(
  userId: string,
  trackId: string,
): Promise<WebVocabularyItem[]> {
  requireUser(userId);
  const { data, error } = await supabase
    .from("passport_vocabulary" as never)
    .select("id,term,translation,context,stage,next_review_at")
    .eq("user_id", userId)
    .eq("track_id", trackId)
    .neq("stage", "mastered")
    .lte("next_review_at", new Date().toISOString())
    .order("next_review_at", { ascending: true })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((value) => {
    const row = record(value);
    return {
      id: String(row.id),
      term: String(row.term),
      translation: String(row.translation ?? ""),
      context: String(row.context ?? ""),
      stage: String(row.stage ?? "new"),
      nextReviewAt: String(row.next_review_at ?? ""),
    };
  });
}

export async function reviewWebVocabulary(userId: string, vocabularyId: string, grade: number) {
  requireUser(userId);
  const { data, error } = await supabase.rpc("review_passport_vocabulary" as never, {
    p_vocabulary_id: vocabularyId,
    p_grade: grade,
  } as never);
  if (error) throw error;
  return data;
}

export async function listWebPassportMissions(
  userId: string,
  trackId: string,
): Promise<WebPassportMission[]> {
  requireUser(userId);
  const { data, error } = await supabase
    .from("passport_daily_missions" as never)
    .select("id,title,prompt,mission_type,status")
    .eq("user_id", userId)
    .eq("track_id", trackId)
    .eq("mission_date", localDateKey())
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
  const { data, error } = await supabase
    .from("passport_daily_missions" as never)
    .update({ status, completed_at: status === "completed" ? now : null, updated_at: now } as never)
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
  const { data, error } = await supabase
    .from("passport_roleplay_sessions" as never)
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
  const { data, error } = await supabase
    .from("passport_roleplay_sessions" as never)
    .insert({ user_id: userId, track_id: trackId, scenario, mode: "text" } as never)
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
  const { error } = await supabase
    .from("passport_roleplay_sessions" as never)
    .update({ status: "completed", completed_at: now, updated_at: now } as never)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) throw error;
}
