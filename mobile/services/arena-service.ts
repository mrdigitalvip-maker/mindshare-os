import { type ArenaChallenge } from "@/lib/arena";
import { workspaceMutationError } from "@/lib/mutation-errors";
import { supabase } from "@/lib/supabase";

const requireUser = (id: string) => {
  if (!id.trim()) throw new Error("Authenticated user required.");
};

const fromRow = (row: Record<string, unknown>): ArenaChallenge => ({
  id: String(row.id),
  slug: String(row.slug),
  title: String(row.title),
  description: typeof row.description === "string" ? row.description : null,
  type: String(row.type),
  targetValue: Number(row.target_value),
  rewardPoints: Number(row.reward_points),
  startsAt: String(row.starts_at),
  endsAt: String(row.ends_at),
  active: Boolean(row.active),
  progress: Number(row.progress ?? 0),
  joinedAt: typeof row.joined_at === "string" ? row.joined_at : null,
  completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
});

export async function listArenaChallenges(userId: string) {
  requireUser(userId);
  const { data, error } = await supabase.rpc("get_arena_challenges");
  if (error) throw workspaceMutationError(error);
  return ((data ?? []) as Record<string, unknown>[]).map(fromRow);
}

export async function joinArenaChallenge(userId: string, challengeId: string) {
  requireUser(userId);
  if (!challengeId.trim()) throw new Error("Challenge required.");
  const { error } = await supabase.rpc("join_arena_challenge", { p_challenge: challengeId.trim() });
  if (error) throw workspaceMutationError(error);
}
