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

export type PassportRoleplayEntry = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type PassportRoleplayTurnResult = {
  sessionId: string;
  reply: string;
  transcript: PassportRoleplayEntry[];
};

export async function listPassportRoleplaySessions(
  userId: string,
  trackId: string,
  limit = 10,
): Promise<PassportRoleplaySession[]> {
  const uid = requireUser(userId);
  const languageTrackId = trackId.trim();
  if (!languageTrackId) throw workspaceMutationError(new Error("Language track required."));
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw workspaceMutationError(new Error("Role-play session limit must be between 1 and 50."));
  }

  const { data, error } = await supabase
    .from("passport_roleplay_sessions")
    .select("id,track_id,scenario,mode,status,transcript,feedback,score,started_at,completed_at")
    .eq("user_id", uid)
    .eq("track_id", languageTrackId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw workspaceMutationError(error);
  return (data ?? []).map((row) => roleplaySessionFrom(row as Record<string, unknown>));
}

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

export async function sendPassportRoleplayMessage(
  userId: string,
  sessionId: string,
  message: string,
): Promise<PassportRoleplayTurnResult> {
  requireUser(userId);
  const id = sessionId.trim();
  const content = message.trim();
  if (!id) throw workspaceMutationError(new Error("Role-play session required."));
  if (!content || content.length > 1200) {
    throw workspaceMutationError(new Error("Role-play message must be between 1 and 1200 characters."));
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  let session = sessionData.session;
  if (!sessionError && session?.expires_at && session.expires_at * 1000 - Date.now() < 30_000) {
    const refreshed = await supabase.auth.refreshSession();
    session = refreshed.data.session;
  }
  if (sessionError || !session?.access_token) {
    throw workspaceMutationError(new Error("Authenticated session required."));
  }

  const { data, error } = await supabase.functions.invoke("passport-roleplay", {
    body: { sessionId: id, message: content },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw workspaceMutationError(error);
  const envelope = (data ?? {}) as Record<string, unknown>;
  if (envelope.ok !== true || !envelope.data || typeof envelope.data !== "object") {
    const details =
      envelope.error && typeof envelope.error === "object"
        ? (envelope.error as Record<string, unknown>)
        : null;
    throw workspaceMutationError(
      new Error(typeof details?.message === "string" ? details.message : "Role-play response failed."),
    );
  }

  const result = envelope.data as Record<string, unknown>;
  const transcript = Array.isArray(result.transcript)
    ? result.transcript
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
        .map((entry) => ({
          role: entry.role === "assistant" ? "assistant" as const : "user" as const,
          content: String(entry.content ?? ""),
          createdAt: String(entry.createdAt ?? ""),
        }))
        .filter((entry) => entry.content.length > 0)
    : [];

  return {
    sessionId: String(result.sessionId ?? id),
    reply: String(result.reply ?? ""),
    transcript,
  };
}

export async function finishPassportRoleplaySession(
  userId: string,
  sessionId: string,
): Promise<PassportRoleplaySession> {
  const uid = requireUser(userId);
  const id = sessionId.trim();
  if (!id) throw workspaceMutationError(new Error("Role-play session required."));

  const completedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("passport_roleplay_sessions")
    .update({ status: "completed", completed_at: completedAt, updated_at: completedAt } as never)
    .eq("id", id)
    .eq("user_id", uid)
    .eq("status", "active")
    .select("id,track_id,scenario,mode,status,transcript,feedback,score,started_at,completed_at")
    .maybeSingle();

  if (error) throw workspaceMutationError(error);
  if (!data) throw workspaceMutationError(new Error("Active role-play session not found."));
  return roleplaySessionFrom(data as unknown as Record<string, unknown>);
}
