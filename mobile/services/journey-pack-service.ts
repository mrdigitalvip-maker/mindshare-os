import { supabase } from "@/lib/supabase";
import { workspaceMutationError } from "@/lib/mutation-errors";
import type { JourneyPack, JourneyPackDetail, JourneyPackStep } from "@/lib/journey-packs";

const packFrom = (r: Record<string, unknown>): JourneyPack => ({
  id: String(r.id),
  slug: String(r.slug),
  version: Number(r.version),
  title: String(r.title),
  shortDescription: String(r.short_description),
  description: String(r.description),
  category: r.category as JourneyPack["category"],
  durationDays: r.duration_days == null ? null : Number(r.duration_days),
  difficulty: r.difficulty as JourneyPack["difficulty"],
});
const stepFrom = (r: Record<string, unknown>): JourneyPackStep => ({
  id: String(r.id),
  sequence: Number(r.sequence),
  phase: String(r.phase),
  title: String(r.title),
  description: String(r.description),
  required: Boolean(r.required),
});
export async function listJourneyPacks() {
  const { data, error } = await supabase.rpc("get_journey_packs");
  if (error) throw workspaceMutationError(error);
  return ((data ?? []) as Record<string, unknown>[]).map(packFrom);
}
export async function getJourneyPack(slug: string): Promise<JourneyPackDetail | null> {
  if (!slug.trim()) return null;
  const { data, error } = await supabase.rpc("get_journey_pack_detail", { p_slug: slug.trim() });
  if (error) throw workspaceMutationError(error);
  if (!data) return null;
  const value = data as { pack: Record<string, unknown>; steps: Record<string, unknown>[] };
  return { pack: packFrom(value.pack), steps: value.steps.map(stepFrom) };
}
export async function startJourneyPack(input: {
  packId: string;
  requestKey: string;
  goal: string;
  targetDate?: string | null;
  context?: string;
}) {
  const { data, error } = await supabase.rpc("start_journey_pack", {
    p_pack_id: input.packId,
    p_request_key: input.requestKey,
    p_goal: input.goal.trim(),
    p_target_date: input.targetDate || null,
    p_context: input.context?.trim() || null,
  });
  if (error) throw workspaceMutationError(error);
  return String(data);
}
