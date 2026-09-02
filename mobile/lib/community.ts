export type CommunityVisibility = "private" | "community";
export type CommunityReaction = "support" | "celebrate" | "respect";
export type ChatReaction = "clap" | "fire" | "strong" | "heart";
export type NotificationMode = "highlights" | "all" | "muted";
export type OfficialChannel = {
  id: string;
  slug: "nexora-community" | "nexora-community-plus";
  name: string;
  premium: boolean;
  joined: boolean;
  eligible: boolean;
  membershipStatus: string | null;
  notificationMode: NotificationMode;
  recentBody: string | null;
  recentAt: string | null;
};
export const hasActiveOfficialMembership = (channel: OfficialChannel) =>
  channel.joined &&
  channel.eligible &&
  (channel.membershipStatus === "active" || channel.membershipStatus === "muted");
export type CommunityMessage = {
  id: string;
  clientRequestId: string | null;
  body: string;
  createdAt: string;
  actorType: "user" | "system";
  senderPublicId: string | null;
  displayName: string;
  avatarUrl: string | null;
  isSelf: boolean;
  removed: boolean;
  replyToId: string | null;
  reactions: Partial<Record<ChatReaction, number>>;
  myReaction: ChatReaction | null;
};

export type CommunityProfile = {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  visibility: CommunityVisibility;
  showMomentum: boolean;
  showStreak: boolean;
  showVerifiedActivity: boolean;
};
export type SquadSummary = {
  id: string;
  name: string;
  description: string | null;
  maxMembers: number;
  memberCount: number;
  role: "owner" | "member";
};
export type CommunityActivity = {
  id: string;
  actorUserId: string;
  eventType: "mission_completed" | "challenge_completed";
  occurredAt: string;
  displayName: string;
  avatarUrl: string | null;
  reactions: Partial<Record<CommunityReaction, number>>;
  myReaction: CommunityReaction | null;
};
export type CommunityHome = {
  profile: CommunityProfile | null;
  squads: SquadSummary[];
  activity: CommunityActivity[];
};
export type SquadMember = {
  userId: string;
  role: "owner" | "member";
  joinedAt: string;
  displayName: string;
  avatarUrl: string | null;
  isSelf: boolean;
};
export type SquadDetail = Omit<SquadSummary, "memberCount"> & { members: SquadMember[] };

export const communityErrorMessage = (error: unknown) => {
  const message =
    error instanceof Error ? error.message : String((error as { message?: string })?.message ?? "");
  const match = Object.entries({
    unauthenticated: "Entre novamente para continuar.",
    channel_not_found: "Esta comunidade não está disponível.",
    username_taken: "Este username já está em uso.",
    profile_invalid: "Revise os dados do perfil e tente novamente.",
    rate_limited: "Muitas tentativas. Aguarde um pouco.",
    squad_full: "Este Squad já está completo.",
    squad_name_invalid: "Use de 2 a 60 caracteres no nome do Squad.",
    already_member: "Você já participa deste Squad.",
    invite_expired: "Este convite expirou ou foi revogado.",
    invite_invalid: "Código de convite inválido.",
    blocked: "Esta interação não está disponível.",
    forbidden: "Você não tem permissão para esta ação.",
    owner_cannot_leave:
      "O responsável deve excluir o Squad; a propriedade não pode ficar sem dono.",
    activity_not_visible: "Esta atividade não está mais disponível.",
    premium_required: "Community+ está disponível para assinantes Premium.",
    membership_required: "Entre na comunidade para participar.",
    membership_restricted: "Sua participação está restrita. Consulte a moderação.",
    membership_removed: "Sua participação nesta comunidade foi removida.",
    message_length: "A mensagem deve ter entre 1 e 1200 caracteres.",
    duplicate_message: "Esta mensagem já foi enviada.",
    invalid_reply: "A mensagem respondida não está mais disponível.",
    request_id_required: "Não foi possível preparar o envio. Tente novamente.",
    "row-level security": "Você não tem permissão para esta ação.",
    "permission denied": "Você não tem permissão para esta ação.",
    "failed to fetch": "Sem conexão. Verifique sua internet e tente novamente.",
    "network request failed": "Sem conexão. Verifique sua internet e tente novamente.",
    unavailable: "Serviço indisponível agora. Tente novamente em instantes.",
  }).find(([code]) => message.includes(code));
  return match?.[1] ?? "Não foi possível concluir. Verifique sua conexão e tente novamente.";
};
