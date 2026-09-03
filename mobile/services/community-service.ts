import { supabase } from "@/lib/supabase";
import type {
  CommunityHome,
  CommunityProfile,
  CommunityReaction,
  OfficialChannel,
  CommunityMessage,
  ChatReaction,
  NotificationMode,
  SquadDetail,
} from "@/lib/community";
import { isCommunityRequestId, normalizeCommunityMessageId } from "@/lib/community-message";
import { normalizeCommunityProfile, profileValidation } from "@/lib/community-ui";
import type { CommunityRealtimeStatus } from "@/lib/community-realtime";
export type { CommunityRealtimeStatus } from "@/lib/community-realtime";

const requireUser = (id: string) => {
  if (!id.trim()) throw new Error("Authenticated user required.");
};
const rpc = async <T>(name: string, params: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw error;
  return data as T;
};
const mapProfile = (p: Record<string, unknown> | null): CommunityProfile | null =>
  p
    ? {
        displayName: p.display_name as string | null,
        username: p.username as string | null,
        avatarUrl: p.avatar_url as string | null,
        bio: p.bio as string | null,
        visibility: p.visibility as CommunityProfile["visibility"],
        showMomentum: Boolean(p.show_momentum),
        showStreak: Boolean(p.show_streak),
        showVerifiedActivity: Boolean(p.show_verified_activity),
      }
    : null;
export async function getCommunityHome(userId: string): Promise<CommunityHome> {
  requireUser(userId);
  const raw = await rpc<Record<string, unknown>>("get_community_home", { p_limit: 20 });
  return {
    profile: mapProfile(raw.profile as Record<string, unknown> | null),
    squads: ((raw.squads ?? []) as Record<string, unknown>[]).map((s) => ({
      id: String(s.id),
      name: String(s.name),
      description: s.description as string | null,
      maxMembers: Number(s.max_members),
      memberCount: Number(s.member_count),
      role: s.role as "owner" | "member",
    })),
    activity: ((raw.activity ?? []) as Record<string, unknown>[]).map((a) => ({
      id: String(a.id),
      actorUserId: String(a.actor_user_id),
      eventType: a.event_type as "mission_completed" | "challenge_completed",
      occurredAt: String(a.occurred_at),
      displayName: String(a.display_name),
      avatarUrl: a.avatar_url as string | null,
      reactions: (a.reactions ?? {}) as Partial<Record<CommunityReaction, number>>,
      myReaction: a.my_reaction as CommunityReaction | null,
    })),
  };
}
export async function saveProfile(userId: string, profile: CommunityProfile) {
  requireUser(userId);
  const clean = normalizeCommunityProfile(profile);
  const validation = profileValidation(
    clean.displayName ?? "",
    clean.username ?? "",
    clean.visibility === "community",
  );
  if (validation || (clean.bio?.length ?? 0) > 240) throw new Error("profile_invalid");
  await rpc("upsert_community_profile", {
    p_display_name: clean.displayName,
    p_username: clean.username,
    p_bio: clean.bio,
    p_visibility: clean.visibility,
    p_show_momentum: clean.showMomentum,
    p_show_streak: clean.showStreak,
    p_show_activity: clean.showVerifiedActivity,
  });
}
export async function createSquad(userId: string, name: string, description: string) {
  requireUser(userId);
  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 60) throw new Error("squad_name_invalid");
  return rpc<string>("create_squad", {
    p_name: cleanName,
    p_description: description.trim() || null,
    p_max_members: 8,
  });
}
export async function acceptInvite(userId: string, code: string) {
  requireUser(userId);
  return rpc<string>("accept_squad_invite", { p_code: code.trim().toUpperCase() });
}
export async function getSquad(userId: string, squadId: string): Promise<SquadDetail | null> {
  requireUser(userId);
  const s = await rpc<Record<string, unknown> | null>("get_squad_detail", { p_squad: squadId });
  if (!s) return null;
  return {
    id: String(s.id),
    name: String(s.name),
    description: s.description as string | null,
    maxMembers: Number(s.max_members),
    role: s.role as "owner" | "member",
    members: ((s.members ?? []) as Record<string, unknown>[]).map((m) => ({
      userId: String(m.user_id),
      role: m.role as "owner" | "member",
      joinedAt: String(m.joined_at),
      displayName: String(m.display_name),
      avatarUrl: m.avatar_url as string | null,
      isSelf: Boolean(m.is_self),
    })),
  };
}
export async function createInvite(userId: string, squadId: string) {
  requireUser(userId);
  return rpc<string>("create_squad_invite", { p_squad: squadId });
}
export async function leaveSquad(userId: string, squadId: string) {
  requireUser(userId);
  await rpc("leave_squad", { p_squad: squadId });
}
export async function deleteSquad(userId: string, squadId: string) {
  requireUser(userId);
  await rpc("delete_squad", { p_squad: squadId });
}
export async function removeMember(userId: string, squadId: string, memberId: string) {
  requireUser(userId);
  await rpc("remove_squad_member", { p_squad: squadId, p_member: memberId });
}
export async function react(
  userId: string,
  activityId: string,
  reaction: CommunityReaction | null,
) {
  requireUser(userId);
  await rpc("set_activity_reaction", { p_activity: activityId, p_reaction: reaction });
}
export async function blockUser(userId: string, targetId: string) {
  requireUser(userId);
  await rpc("set_community_block", { p_user: targetId, p_blocked: true });
}
export async function reportTarget(
  userId: string,
  targetType: "profile" | "squad" | "activity",
  targetId: string,
  reason: "spam" | "harassment" | "inappropriate" | "impersonation" | "other",
) {
  requireUser(userId);
  await rpc("report_community_target", {
    p_type: targetType,
    p_target: targetId,
    p_reason: reason,
    p_details: null,
  });
}

export async function getOfficialChannels(userId: string): Promise<OfficialChannel[]> {
  requireUser(userId);
  const rows = await rpc<Record<string, unknown>[]>("get_official_communities");
  return rows.map((r) => ({
    id: String(r.id),
    slug: r.slug as OfficialChannel["slug"],
    name: String(r.name),
    premium: Boolean(r.premium),
    joined: Boolean(r.joined),
    eligible: Boolean(r.eligible),
    membershipStatus: r.membership_status as string | null,
    notificationMode: r.notification_mode as NotificationMode,
    recentBody: r.recent_body as string | null,
    recentAt: r.recent_at as string | null,
  }));
}
export async function joinOfficialChannel(userId: string, channelId: string) {
  requireUser(userId);
  await rpc("join_official_community", { p_channel: channelId });
}
export async function leaveOfficialChannel(userId: string, channelId: string) {
  requireUser(userId);
  await rpc("leave_official_community", { p_channel: channelId });
}
export async function setNotificationMode(
  userId: string,
  channelId: string,
  mode: NotificationMode,
) {
  requireUser(userId);
  await rpc("set_community_notifications", { p_channel: channelId, p_mode: mode });
}
const mapMessage = (r: Record<string, unknown>): CommunityMessage => ({
  id: String(r.id),
  clientRequestId: r.client_request_id as string | null,
  body: String(r.body),
  createdAt: String(r.created_at),
  actorType: r.actor_type as CommunityMessage["actorType"],
  senderPublicId: r.sender_public_id as string | null,
  displayName: String(r.display_name),
  avatarUrl: r.avatar_url as string | null,
  isSelf: Boolean(r.is_self),
  removed: Boolean(r.removed),
  replyToId: r.reply_to_id as string | null,
  reactions: (r.reactions ?? {}) as CommunityMessage["reactions"],
  myReaction: r.my_reaction as ChatReaction | null,
});
export async function getMessages(userId: string, channelId: string, before?: string) {
  requireUser(userId);
  const rows = await rpc<Record<string, unknown>[]>("get_community_messages", {
    p_channel: channelId,
    p_before: before ?? null,
    p_limit: 30,
  });
  return rows.map(mapMessage);
}
export async function sendMessage(
  userId: string,
  channelId: string,
  body: string,
  requestId: string,
  replyToId?: string | null,
) {
  requireUser(userId);
  const clean = body.trim();
  if (!clean || clean.length > 1200) throw new Error("message_length");
  if (!isCommunityRequestId(requestId)) throw new Error("request_id_required");
  const result = await rpc<unknown>("send_community_message", {
    p_channel: channelId,
    p_body: clean,
    p_client_request_id: requestId,
    p_reply_to: replyToId ?? null,
  });
  return normalizeCommunityMessageId(result);
}
export async function reactToMessage(
  userId: string,
  messageId: string,
  reaction: ChatReaction | null,
) {
  requireUser(userId);
  await rpc("set_message_reaction", { p_message: messageId, p_reaction: reaction });
}
export async function reportMessage(userId: string, messageId: string) {
  requireUser(userId);
  await rpc("report_community_message", {
    p_message: messageId,
    p_reason: "other",
    p_details: null,
  });
}
export async function blockMessageSender(userId: string, messageId: string) {
  requireUser(userId);
  await rpc("block_community_message_sender", { p_message: messageId });
}
export function subscribeToChannel(
  channelId: string,
  onChange: () => void,
  onStatus: (status: CommunityRealtimeStatus) => void = () => undefined,
) {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const reconcile = () => {
    if (!active) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (active) onChange();
    }, 120);
  };
  const channel = supabase
    .channel(`community:${channelId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "community_messages",
        filter: `channel_id=eq.${channelId}`,
      },
      reconcile,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "community_message_reactions" },
      reconcile,
    )
    .subscribe((status) => {
      if (!active) return;
      if (status === "SUBSCRIBED") {
        onStatus("connected");
        reconcile();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") onStatus("error");
      else if (status === "CLOSED") onStatus("disconnected");
    });
  onStatus("connecting");
  return () => {
    if (!active) return;
    active = false;
    clearTimeout(timer);
    void supabase.removeChannel(channel);
  };
}
