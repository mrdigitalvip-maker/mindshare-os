import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const client = supabase as unknown as SupabaseClient;

export type Mission = {
  id: string;
  journey_id: string | null;
  title: string;
  description: string | null;
  source_type: string;
  status: string;
  scheduled_date: string;
  momentum_value: number;
};
export type Journey = {
  id: string;
  title: string;
  objective: string | null;
  category: string | null;
  status: string;
  target_date: string | null;
  created_at: string;
};
export type ArenaChallenge = {
  id: string;
  title: string;
  description: string;
  target_value: number;
  reward_points: number;
  starts_at: string;
  ends_at: string;
  progress: number;
  joined_at: string | null;
  completed_at: string | null;
};
export type Pack = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  category: string;
  duration_days: number;
  difficulty: string;
};

function message(error: { message?: string } | null) {
  if (error) throw new Error(error.message || "request_failed");
}
export const parityKeys = {
  all: ["canonical-parity"] as const,
  mission: ["canonical-parity", "mission"] as const,
  journeys: ["canonical-parity", "journeys"] as const,
  arena: ["canonical-parity", "arena"] as const,
  community: ["canonical-parity", "community"] as const,
  packs: ["canonical-parity", "packs"] as const,
};
export async function dailyMission() {
  const date = new Date().toLocaleDateString("en-CA");
  const { data, error } = await client.rpc("ensure_daily_journey_mission", { p_local_date: date });
  message(error);
  return data as Mission | null;
}
export async function listJourneys() {
  const { data, error } = await client
    .from("journeys")
    .select("id,title,objective,category,status,target_date,created_at")
    .order("created_at", { ascending: false });
  message(error);
  return (data || []) as Journey[];
}
export async function completeJourneyAction(id: string) {
  const { error } = await client.rpc("complete_journey_action", { p_mission: id });
  message(error);
}
export async function listArena() {
  const { data, error } = await client.rpc("get_arena_challenges");
  message(error);
  return (data || []) as ArenaChallenge[];
}
export async function joinArena(id: string) {
  const { error } = await client.rpc("join_arena_challenge", { p_challenge: id });
  message(error);
}
export async function communityHome() {
  const { data, error } = await client.rpc("get_community_home", { p_limit: 20 });
  message(error);
  return (data || {}) as Record<string, unknown>;
}
export async function listPacks() {
  const { data, error } = await client.rpc("get_journey_packs");
  message(error);
  return (data || []) as Pack[];
}
export async function packDetail(slug: string) {
  const { data, error } = await client.rpc("get_journey_pack_detail", { p_slug: slug });
  message(error);
  return data as Record<string, unknown> | null;
}
export async function startPack(
  packId: string,
  requestKey: string,
  goal: string,
  targetDate?: string,
  context?: string,
) {
  const { data, error } = await client.rpc("start_journey_pack", {
    p_pack_id: packId,
    p_request_key: requestKey,
    p_goal: goal,
    p_target_date: targetDate || null,
    p_context: context || null,
  });
  message(error);
  return data as string;
}

const safeErrors: Record<string, string> = {
  journey_limit_reached: "Your current plan's Journey limit has been reached.",
  pack_not_found: "This Pack is no longer available.",
  pack_not_available: "This Pack is not available yet.",
  challenge_not_joinable: "This challenge cannot be joined now.",
  squad_full: "This Squad is full.",
  invite_expired: "This invite has expired.",
  blocked: "This action is unavailable.",
  forbidden: "You do not have permission to do that.",
  rate_limited: "Please wait a moment and try again.",
};
export function safeBackendError(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  return (
    Object.entries(safeErrors).find(([key]) => raw.includes(key))?.[1] ||
    "We couldn't complete that request. Please try again."
  );
}
