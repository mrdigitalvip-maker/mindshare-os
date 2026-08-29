import { supabase } from "@/lib/supabase";
import type {
  CommunityHome,
  CommunityProfile,
  CommunityReaction,
  SquadDetail,
} from "@/lib/community";

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
  await rpc("upsert_community_profile", {
    p_display_name: profile.displayName,
    p_username: profile.username,
    p_bio: profile.bio,
    p_visibility: profile.visibility,
    p_show_momentum: profile.showMomentum,
    p_show_streak: profile.showStreak,
    p_show_activity: profile.showVerifiedActivity,
  });
}
export async function createSquad(userId: string, name: string, description: string) {
  requireUser(userId);
  return rpc<string>("create_squad", {
    p_name: name,
    p_description: description || null,
    p_max_members: 8,
  });
}
export async function acceptInvite(userId: string, code: string) {
  requireUser(userId);
  return rpc<string>("accept_squad_invite", { p_code: code });
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
