import {
  passportRoleplayScenarios,
  type PassportRoleplayScenario,
  type PassportRoleplaySession,
} from "@/lib/passport";
import { workspaceMutationError } from "@/lib/mutation-errors";
import { supabase } from "@/lib/supabase";

const requireUser = (userId: string) => {
  const value = userId.trim();
  if (!value) throw workspaceMutationError(new Error("Authenticated user required."));
  return value;
};

const roleplaySessionFrom = (row: Record<string, unknown>): PassportRoleplaySession => ({
  id: String(row.id),
  trackId: String(row.track_id),
  scenario: String(row.scenario) as PassportRoleplayScenario,
  mode: String(row.mode) as PassportRoleplaySession["mode"],
  status: String(row.status) as PassportRoleplaySession["status"],
  transcript: Array.isArray(row.transcript) ? row.transcript : [],
  feedback:
    row.feedback && typeof row.feedback === "object" && !Array.isArray(row.feedback)
      ? (row.feedback as Record<string, unknown>)
      : {},
  score: row.score == null ? null : Number(row.score),
  startedAt: String(row.started_at),
  completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
});

export type StartPassportRoleplayInput = {
  trackId: string;
  scenario: PassportRoleplayScenario;
  mode?: "text" | "voice";
};

export async function startPassportRoleplaySession(
  userId: string,
  input: StartPassportRoleplayInput,
): Promise<PassportRoleplaySession> {
  const uid = requireUser(userId);
  const trackId = input.trackId.trim();
  const mode = input.mode ?? "text";

  if (!trackId) throw workspaceMutationError(new Error("Language track required."));
  if (!passportRoleplayScenarios.includes(input.scenario)) {
    throw workspaceMutationError(new Error("Unsupported role-play scenario."));
  }
  if (mode !== "text" && mode !== "voice") {
    throw workspaceMutationError(new Error("Unsupported role-play mode."));
  }

  const { data, error } = await supabase
    .from("passport_roleplay_sessions")
    .insert({
      user_id: uid,
      track_id: trackId,
      scenario: input.scenario,
      mode,
    } as never)
    .select(
      "id,track_id,scenario,mode,status,transcript,feedback,score,started_at,completed_at",
    )
    .single();

  if (error) throw workspaceMutationError(error);
  return roleplaySessionFrom(data as unknown as Record<string, unknown>);
}
