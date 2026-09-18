import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const client = supabase as unknown as SupabaseClient;
export type Mission = {
  id: string;
  journey_id: string | null;
  title: string;
  description: string | null;
  source_type: string;
  source_id: string;
  status: string;
  scheduled_date: string;
  momentum_value: number;
};
export type Journey = {
  id: string;
  title: string;
  objective: string | null;
  context: string | null;
  category: string | null;
  status: string;
  target_date: string | null;
  created_at: string;
  source_pack_id: string | null;
  source_pack_version: number | null;
};
export type MomentumEvent = {
  id: string;
  points: number;
  event_type: string;
  source_type: string;
  created_at: string;
};
export type Momentum = {
  total: number;
  week: number;
  verifiedCount: number;
  streak: number;
  events: MomentumEvent[];
};
export type ArenaChallenge = {
  id: string;
  title: string;
  description: string;
  target_value: number;
  reward_points: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
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
export type CommunityProfile = {
  display_name: string | null;
  username: string | null;
  bio: string | null;
  visibility: "private" | "community";
  show_momentum: boolean;
  show_streak: boolean;
  show_verified_activity: boolean;
};
export type Squad = {
  id: string;
  name: string;
  description: string | null;
  max_members: number;
  member_count: number;
  role: "owner" | "member";
};
export type Activity = {
  id: string;
  actor_user_id: string;
  display_name: string;
  event_type: string;
  occurred_at: string;
  reactions: Partial<Record<Reaction, number>>;
  my_reaction: Reaction | null;
};
export type CommunityHome = {
  profile: CommunityProfile | null;
  squads: Squad[];
  activity: Activity[];
};
export type CommunityNotificationMode = "highlights" | "all" | "muted";
export type OfficialCommunity = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  premium: boolean;
  eligible: boolean;
  joined: boolean;
  membership_status: string | null;
  notification_mode: CommunityNotificationMode;
  member_count: number;
  unread_count: number;
  recent_body: string | null;
  recent_at: string | null;
};
export type OfficialCommunityMessage = {
  id: string;
  body: string;
  created_at: string;
  actor_type: "user" | "system";
  display_name: string;
  is_self: boolean;
  removed: boolean;
};
export type Reaction = "support" | "celebrate" | "respect";
const COMMUNITY_USERNAME = /^[a-z][a-z0-9_]{2,29}$/;
const COMMUNITY_RESERVED = new Set([
  "admin",
  "administrator",
  "kivryn",
  "nexora",
  "official",
  "moderator",
  "support",
  "system",
]);
export const isCommunityProfileReady = (profile: CommunityProfile | null | undefined) =>
  Boolean(
    profile &&
      profile.visibility === "community" &&
      profile.display_name?.trim() &&
      profile.username?.trim() &&
      COMMUNITY_USERNAME.test(profile.username.trim().toLowerCase()),
  );

export type SquadDetail = {
  id: string;
  name: string;
  description: string | null;
  max_members: number;
  member_count: number;
  role: "owner" | "member";
  members: Array<{
    user_id: string;
    role: "owner" | "member";
    joined_at: string;
    display_name: string;
    is_self: boolean;
  }>;
};

function fail(error: { message?: string } | null) {
  if (error) throw new Error(error.message || "request_failed");
}
async function rpc<T>(name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await client.rpc(name, args);
  fail(error);
  return data as T;
}
export const parityKeys = {
  all: ["canonical-parity"] as const,
  mission: ["canonical-parity", "mission"] as const,
  journeys: ["canonical-parity", "journeys"] as const,
  journey: (id: string) => ["canonical-parity", "journeys", id] as const,
  momentum: ["canonical-parity", "momentum"] as const,
  arena: ["canonical-parity", "arena"] as const,
  community: ["canonical-parity", "community"] as const,
  communityChannels: ["canonical-parity", "community", "channels"] as const,
  communityMessages: (id: string) => ["canonical-parity", "community", "messages", id] as const,
  squad: (id: string) => ["canonical-parity", "community", "squad", id] as const,
  packs: ["canonical-parity", "packs"] as const,
  pack: (slug: string) => ["canonical-parity", "packs", slug] as const,
};

function isMission(value: unknown): value is Mission {
  if (!value || typeof value !== "object") return false;
  const mission = value as Partial<Mission>;
  return (
    typeof mission.id === "string" &&
    typeof mission.title === "string" &&
    typeof mission.source_type === "string" &&
    typeof mission.source_id === "string" &&
    typeof mission.status === "string" &&
    typeof mission.scheduled_date === "string" &&
    typeof mission.momentum_value === "number"
  );
}

/**
 * PostgREST may encode a function returning a named row type either as that
 * row or as a one-item rowset, depending on the deployed function metadata.
 * Normalize both forms before React receives the value, and keep malformed
 * live data in the query's explicit error state instead of crashing render.
 */
export function normalizeMissionPayload(payload: unknown): Mission | null {
  const candidate = Array.isArray(payload) ? payload[0] : payload;
  if (candidate == null) return null;
  if (!isMission(candidate)) throw new Error("invalid_daily_mission_response");
  return candidate;
}

export async function dailyMission(): Promise<Mission | null> {
  const payload = await rpc<unknown>("ensure_daily_journey_mission", {
    p_local_date: new Date().toLocaleDateString("en-CA"),
  });
  return normalizeMissionPayload(payload);
}
export async function listJourneys() {
  const { data, error } = await client
    .from("journeys")
    .select(
      "id,title,objective,context,category,status,target_date,created_at,source_pack_id,source_pack_version",
    )
    .order("created_at", { ascending: false });
  fail(error);
  return (data || []) as Journey[];
}
export async function journeyDetail(id: string) {
  const { data, error } = await client
    .from("journeys")
    .select(
      "id,title,objective,context,category,status,target_date,created_at,source_pack_id,source_pack_version",
    )
    .eq("id", id)
    .maybeSingle();
  fail(error);
  return data as Journey | null;
}
export async function createJourney(input: {
  title: string;
  objective: string;
  category: string;
  targetDate?: string;
  context?: string;
}) {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  fail(authError);
  if (!user) throw new Error("authentication_required");
  const { data, error } = await client
    .from("journeys")
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      objective: input.objective.trim(),
      category: input.category,
      target_date: input.targetDate || null,
      context: input.context?.trim() || null,
    })
    .select("id")
    .single();
  fail(error);
  if (!data) throw new Error("creation_failed");
  return String(data.id);
}
export async function completeJourneyAction(id: string) {
  await rpc("complete_journey_action", { p_mission: id });
}
export async function momentumSummary(): Promise<Momentum> {
  const { data, error } = await client
    .from("momentum_events")
    .select("id,points,event_type,source_type,created_at")
    .order("created_at", { ascending: false });
  fail(error);
  const events = (data || []) as MomentumEvent[];
  const now = new Date(),
    day = (now.getDay() + 6) % 7,
    start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day);
  const verifiedDates = [
    ...new Set(
      events
        .filter((e) => e.event_type === "mission_completed")
        .map((e) => e.created_at.slice(0, 10)),
    ),
  ];
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (verifiedDates.includes(cursor.toLocaleDateString("en-CA"))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return {
    total: events.reduce((n, e) => n + e.points, 0),
    week: events.filter((e) => new Date(e.created_at) >= start).reduce((n, e) => n + e.points, 0),
    verifiedCount: events.filter((e) => e.event_type === "mission_completed").length,
    streak,
    events: events.slice(0, 10),
  };
}
export async function listArena() {
  return rpc<ArenaChallenge[]>("get_arena_challenges");
}
export async function joinArena(id: string) {
  await rpc("join_arena_challenge", { p_challenge: id });
}
export async function communityHome() {
  const home = await rpc<CommunityHome>("get_community_home", { p_limit: 20 });
  return {
    ...home,
    activity: home.activity.map((item) => ({
      ...item,
      display_name: item.display_name.replace(/NEXORA/g, "KIVRYN"),
    })),
  };
}
export async function listOfficialCommunities() {
  const rows = await rpc<OfficialCommunity[]>("get_official_communities");
  return (rows || []).map((row) => ({
    ...row,
    name: row.name.replace(/NEXORA/g, "KIVRYN"),
    description: row.description?.replace(/NEXORA/g, "KIVRYN") ?? null,
  }));
}
export async function joinOfficialCommunity(id: string) {
  await rpc("join_official_community", { p_channel: id });
}
export async function leaveOfficialCommunity(id: string) {
  await rpc("leave_official_community", { p_channel: id });
}
export async function setOfficialCommunityNotifications(
  id: string,
  mode: CommunityNotificationMode,
) {
  await rpc("set_community_notifications", { p_channel: id, p_mode: mode });
}
export async function markOfficialCommunityRead(id: string) {
  await rpc("mark_community_read", { p_channel: id });
}
export async function listOfficialCommunityMessages(id: string) {
  const rows = await rpc<OfficialCommunityMessage[]>("get_community_messages", {
    p_channel: id,
    p_before: null,
    p_limit: 50,
  });
  return (rows || []).map((row) => ({
    ...row,
    display_name:
      row.actor_type === "system"
        ? "KIVRYN"
        : row.display_name.replace(/NEXORA/g, "KIVRYN"),
  }));
}
export async function sendOfficialCommunityMessage(id: string, body: string) {
  const clean = body.trim();
  if (!clean || clean.length > 1200) throw new Error("message_length");
  const requestId = globalThis.crypto?.randomUUID?.();
  if (!requestId) throw new Error("request_id_required");
  return rpc<string>("send_community_message", {
    p_channel: id,
    p_body: clean,
    p_client_request_id: requestId,
    p_reply_to: null,
  });
}
export function subscribeOfficialCommunity(id: string, onChange: () => void) {
  const channel = client
    .channel(`web-community:${id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "community_messages", filter: `channel_id=eq.${id}` },
      onChange,
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export async function saveCommunityProfile(p: CommunityProfile) {
  const displayName = p.display_name?.trim() || null;
  const username = p.username?.trim().replace(/^@+/, "").toLowerCase() || null;
  const bio = p.bio?.trim() || null;
  if ((displayName?.length ?? 0) > 60 || (bio?.length ?? 0) > 240)
    throw new Error("profile_invalid");
  if (username && (!COMMUNITY_USERNAME.test(username) || COMMUNITY_RESERVED.has(username)))
    throw new Error("profile_invalid");
  if (p.visibility === "community" && (!displayName || !username))
    throw new Error("profile_invalid");
  await rpc("upsert_community_profile", {
    p_display_name: displayName,
    p_username: username,
    p_bio: bio,
    p_visibility: p.visibility,
    p_show_momentum: p.show_momentum,
    p_show_streak: p.show_streak,
    p_show_activity: p.show_verified_activity,
  });
}
export async function createSquad(name: string, description: string) {
  const cleanName = name.trim();
  const cleanDescription = description.trim();
  if (cleanName.length < 2 || cleanName.length > 60) throw new Error("squad_name_invalid");
  if (cleanDescription.length > 240) throw new Error("squad_description_invalid");
  return rpc<string>("create_squad", {
    p_name: cleanName,
    p_description: cleanDescription || null,
    p_max_members: 8,
  });
}
export async function acceptInvite(code: string) {
  return rpc<string>("accept_squad_invite", { p_code: code.trim() });
}
export async function getSquad(id: string) {
  const squad = await rpc<SquadDetail | null>("get_squad_detail", { p_squad: id });
  if (!squad) return null;
  return {
    ...squad,
    member_count: Number(squad.member_count ?? squad.members.length),
    members: squad.members.map((member) => ({
      ...member,
      display_name: member.display_name.replace(/NEXORA/g, "KIVRYN"),
    })),
  };
}
export async function createInvite(id: string) {
  const result = await rpc<{ code: string; expires_at: string }>("create_squad_invite_v2", {
    p_squad: id,
  });
  if (!result?.code || !result?.expires_at) throw new Error("invalid_rpc_response");
  return { code: result.code, expiresAt: new Date(result.expires_at) };
}
export async function leaveSquad(id: string) {
  await rpc("leave_squad", { p_squad: id });
}
export async function deleteSquad(id: string) {
  await rpc("delete_squad", { p_squad: id });
}
export async function removeSquadMember(squad: string, member: string) {
  await rpc("remove_squad_member", { p_squad: squad, p_member: member });
}
export async function react(activity: string, reaction: Reaction | null) {
  await rpc("set_activity_reaction", { p_activity: activity, p_reaction: reaction });
}
export async function setBlock(user: string, blocked: boolean) {
  await rpc("set_community_block", { p_user: user, p_blocked: blocked });
}
export async function reportTarget(
  type: "profile" | "squad" | "activity",
  target: string,
  reason: string,
  details: string,
) {
  await rpc("report_community_target", {
    p_type: type,
    p_target: target,
    p_reason: reason,
    p_details: details.trim() || null,
  });
}
export async function listPacks() {
  return rpc<Pack[]>("get_journey_packs");
}
export async function packDetail(slug: string) {
  return rpc<{
    pack: Pack & { id: string; description: string };
    steps: Array<{
      id: string;
      sequence: number;
      phase: string;
      title: string;
      description: string;
    }>;
  } | null>("get_journey_pack_detail", { p_slug: slug });
}
export async function startPack(
  packId: string,
  requestKey: string,
  goal: string,
  targetDate?: string,
  context?: string,
) {
  return rpc<string>("start_journey_pack", {
    p_pack_id: packId,
    p_request_key: requestKey,
    p_goal: goal,
    p_target_date: targetDate || null,
    p_context: context || null,
  });
}

const safeErrors: Record<string, string> = {
  FREE_CREATION_LIMIT_REACHED:
    "Seu plano Free permite uma Jornada ativa. Pause ou conclua a atual para continuar.",
  journey_limit_reached: "O limite de Jornadas do seu plano foi atingido.",
  invalid_pack_input: "Revise a meta e a data escolhidas.",
  pack_not_found: "Este Pack não está mais disponível.",
  pack_retired: "Este Pack foi retirado.",
  pack_not_available: "Este Pack ainda não está disponível.",
  challenge_not_joinable: "Este desafio não pode mais ser iniciado.",
  premium_required: "Esta comunidade é exclusiva do KIVRYN Premium.",
  profile_required: "Conclua seu perfil da Comunidade para continuar.",
  membership_required: "Entre na comunidade para participar.",
  membership_restricted: "Sua participação nesta comunidade está restrita.",
  membership_removed: "Sua participação nesta comunidade foi removida.",
  message_length: "A mensagem deve ter entre 1 e 1200 caracteres.",
  request_id_required: "Não foi possível preparar o envio. Tente novamente.",
  squad_full: "Este Squad atingiu o limite de membros.",
  squad_not_found: "Este Squad não existe mais.",
  invite_invalid: "O código de convite é inválido.",
  invite_expired: "Este convite expirou.",
  username_taken: "Este nome de usuário já está em uso.",
  owner_cannot_leave: "O proprietário deve encerrar o Squad.",
  activity_not_visible: "Esta atividade não está disponível.",
  blocked: "Esta ação não está disponível por causa de um bloqueio.",
  forbidden: "Você não tem permissão para realizar esta ação.",
  rate_limited: "Aguarde um momento antes de tentar novamente.",
  authentication_required: "Entre novamente para continuar.",
  unauthenticated: "Entre novamente para continuar.",
};
export function safeBackendError(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  return (
    Object.entries(safeErrors).find(([key]) =>
      raw.toLowerCase().includes(key.toLowerCase()),
    )?.[1] || "Não foi possível concluir a solicitação. Tente novamente."
  );
}
