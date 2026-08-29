import {
  localDateKey,
  type Journey,
  type JourneyCategory,
  type JourneyMission,
  type MomentumSummary,
  type MomentumEvent,
  summarizeMomentum,
  type WeeklyChallenge,
} from "@/lib/journeys";
import { supabase } from "@/lib/supabase";
import { workspaceMutationError } from "@/lib/mutation-errors";
const user = (id: string) => {
  if (!id.trim()) throw new Error("Authenticated user required.");
  return id.trim();
};
const journeyFrom = (r: Record<string, unknown>): Journey => ({
  id: String(r.id),
  title: String(r.title),
  category: r.category as JourneyCategory,
  objective: String(r.objective),
  context: typeof r.context === "string" ? r.context : null,
  status: r.status as Journey["status"],
  startDate: String(r.start_date),
  targetDate: typeof r.target_date === "string" ? r.target_date : null,
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
  sourcePackId: typeof r.source_pack_id === "string" ? r.source_pack_id : null,
  sourcePackVersion: r.source_pack_version == null ? null : Number(r.source_pack_version),
});
const missionFrom = (r: Record<string, unknown>): JourneyMission => ({
  id: String(r.id),
  journeyId: typeof r.journey_id === "string" ? r.journey_id : null,
  sourceType: r.source_type as JourneyMission["sourceType"],
  sourceId: String(r.source_id),
  title: String(r.title),
  description: typeof r.description === "string" ? r.description : null,
  status: r.status as JourneyMission["status"],
  scheduledDate: String(r.scheduled_date),
  momentumValue: Number(r.momentum_value),
  completedAt: typeof r.completed_at === "string" ? r.completed_at : null,
  createdAt: String(r.created_at),
});
export async function listJourneys(userId: string) {
  const { data, error } = await supabase
    .from("journeys")
    .select("*")
    .eq("user_id", user(userId))
    .order("updated_at", { ascending: false });
  if (error) throw workspaceMutationError(error);
  return (data ?? []).map(journeyFrom);
}
export async function getJourney(userId: string, id: string) {
  const { data, error } = await supabase
    .from("journeys")
    .select("*")
    .eq("user_id", user(userId))
    .eq("id", id)
    .maybeSingle();
  if (error) throw workspaceMutationError(error);
  return data ? journeyFrom(data) : null;
}
export async function createJourney(
  userId: string,
  input: {
    title: string;
    objective: string;
    context?: string;
    category: JourneyCategory;
    targetDate?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("journeys")
    .insert({
      user_id: user(userId),
      title: input.title.trim(),
      objective: input.objective.trim(),
      context: input.context?.trim() || null,
      category: input.category,
      target_date: input.targetDate || null,
    })
    .select("id")
    .single();
  if (error) throw workspaceMutationError(error);
  return data.id as string;
}
export async function setJourneyStatus(userId: string, id: string, status: Journey["status"]) {
  const { error } = await supabase
    .from("journeys")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("user_id", user(userId))
    .eq("id", id);
  if (error) throw workspaceMutationError(error);
}
export async function ensureDailyMission(userId: string, date = new Date()) {
  user(userId);
  const { data, error } = await supabase.rpc("ensure_daily_journey_mission", {
    p_local_date: localDateKey(date),
  });
  if (error) throw workspaceMutationError(error);
  return data ? missionFrom(data) : null;
}
export async function completeJourneyAction(userId: string, missionId: string) {
  user(userId);
  if (!missionId.trim()) throw new Error("Mission required.");
  const { data, error } = await supabase.rpc("complete_journey_action", {
    p_mission: missionId.trim(),
  });
  if (error) throw workspaceMutationError(error);
  return missionFrom(data);
}
export async function getMomentum(userId: string, date = new Date()): Promise<MomentumSummary> {
  const uid = user(userId);
  const { data, error } = await supabase
    .from("momentum_events")
    .select("id,journey_id,source_type,source_id,points,created_at,event_type")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw workspaceMutationError(error);
  const events: MomentumEvent[] = (data ?? []).map((row) => ({
    id: String(row.id),
    journeyId: typeof row.journey_id === "string" ? row.journey_id : null,
    sourceType: String(row.source_type),
    sourceId: String(row.source_id),
    eventType: String(row.event_type),
    points: Number(row.points),
    createdAt: String(row.created_at),
  }));
  return summarizeMomentum(events, date);
}
export async function getWeeklyChallenge(userId: string): Promise<WeeklyChallenge | null> {
  const { data, error } = await supabase
    .from("challenges")
    .select(
      "id,title,description,target_value,reward_points,starts_at,ends_at,user_challenges(progress,completed_at)",
    )
    .eq("active", true)
    .lte("starts_at", new Date().toISOString())
    .gte("ends_at", new Date().toISOString())
    .eq("user_challenges.user_id", user(userId))
    .order("ends_at")
    .limit(1)
    .maybeSingle();
  if (error) throw workspaceMutationError(error);
  if (!data) return null;
  const participation = Array.isArray(data.user_challenges) ? data.user_challenges[0] : null;
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    targetValue: data.target_value,
    rewardPoints: data.reward_points,
    progress: participation?.progress ?? 0,
    completedAt: participation?.completed_at ?? null,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
  };
}
