/* eslint-disable @typescript-eslint/no-explicit-any -- Phase 3 tables are typed after the deployment migration regenerates Database. */
import { supabase } from "@/lib/supabase";
import { getRequiredUserId } from "./supabase-service";

// These tables ship in the Phase 3 migration. The generated client types are
// intentionally not hand-edited; regenerate them after applying migrations.
const db = supabase as unknown as {
  from: (table: string) => any;
  rpc: (name: string, params: Record<string, unknown>) => any;
};

export type StudioCategory = "language" | "academy" | "creator";
export type StudioTrack = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: StudioCategory;
};
export type StudioLesson = {
  id: string;
  track_id: string;
  slug: string;
  title: string;
  description: string;
  content: { explanation?: string; example?: string; exercise?: string; practicalTask?: string };
  lesson_type: string;
  difficulty: string;
  order_index: number;
  estimated_minutes: number;
  premium: boolean;
};
export type StudioEnrollment = {
  id: string;
  track_id: string;
  level: string;
  target: string;
  daily_minutes: number;
  locale: string | null;
};

export const STUDIO_XP = Object.freeze({
  lessonCompleted: 20,
  exerciseCompleted: 5,
  dailyGoal: 10,
  challenge: 15,
});

export const StudioService = {
  async overview() {
    const userId = await getRequiredUserId();
    const [tracks, lessons, enrollments, progress, goals, streak, achievements, activity] =
      await Promise.all([
        db
          .from("studio_tracks")
          .select("id,slug,title,description,category")
          .eq("active", true)
          .order("title"),
        db
          .from("studio_lessons")
          .select(
            "id,track_id,slug,title,description,content,lesson_type,difficulty,order_index,estimated_minutes,premium",
          )
          .eq("active", true)
          .order("order_index"),
        db
          .from("studio_enrollments")
          .select("id,track_id,level,target,daily_minutes,locale")
          .eq("user_id", userId),
        db
          .from("studio_progress")
          .select("lesson_id,status,score,xp,completed_at")
          .eq("user_id", userId),
        db
          .from("studio_daily_goals")
          .select(
            "goal_date,target_minutes,target_activities,completed_minutes,completed_activities,completed",
          )
          .eq("user_id", userId)
          .order("goal_date", { ascending: false })
          .limit(7),
        db
          .from("studio_streaks")
          .select("current_streak,longest_streak,total_xp,last_active_date")
          .eq("user_id", userId)
          .maybeSingle(),
        db
          .from("studio_achievements")
          .select("achievement,unlocked_at")
          .eq("user_id", userId)
          .order("unlocked_at", { ascending: false }),
        db
          .from("studio_activity")
          .select("id,activity_type,track_id,lesson_id,local_date,xp,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
    const failure = [
      tracks,
      lessons,
      enrollments,
      progress,
      goals,
      streak,
      achievements,
      activity,
    ].find((item) => item.error);
    if (failure?.error) throw failure.error;
    return {
      tracks: (tracks.data ?? []) as StudioTrack[],
      lessons: (lessons.data ?? []) as StudioLesson[],
      enrollments: (enrollments.data ?? []) as StudioEnrollment[],
      progress: progress.data ?? [],
      goals: goals.data ?? [],
      streak: streak.data,
      achievements: achievements.data ?? [],
      activity: activity.data ?? [],
    };
  },
  async enroll(input: {
    trackId: string;
    level: string;
    target: string;
    dailyMinutes: number;
    locale?: string;
  }) {
    const userId = await getRequiredUserId();
    const { error } = await db.from("studio_enrollments").upsert(
      {
        user_id: userId,
        track_id: input.trackId,
        level: input.level,
        target: input.target.trim(),
        daily_minutes: input.dailyMinutes,
        locale: input.locale ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,track_id" },
    );
    if (error) throw error;
  },
  async startLesson(lessonId: string) {
    const userId = await getRequiredUserId();
    const { error } = await db.from("studio_progress").upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        status: "in_progress",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id", ignoreDuplicates: true },
    );
    if (error) throw error;
  },
  async completeLesson(lessonId: string, score = 100) {
    const { data, error } = await db.rpc("complete_studio_lesson", {
      p_lesson_id: lessonId,
      p_score: score,
    });
    if (error) throw error;
    return data as { xp: number; streak: number; date: string };
  },
};

export const UsageService = {
  async today() {
    const userId = await getRequiredUserId();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await db
      .from("ai_usage")
      .select("action,input_units,output_units")
      .eq("user_id", userId)
      .eq("usage_date", today);
    if (error) throw error;
    return (data ?? []).reduce(
      (counts: Record<string, number>, row: { action: string }) => ({
        ...counts,
        [row.action]: (counts[row.action] ?? 0) + 1,
      }),
      {},
    );
  },
};
