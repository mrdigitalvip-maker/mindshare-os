export type CommunityVisibility = "private" | "community";
export type CommunityReaction = "support" | "celebrate" | "respect";

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
    username_taken: "Este username já está em uso.",
    rate_limited: "Muitas tentativas. Aguarde um pouco.",
    squad_full: "Este Squad já está completo.",
    invite_expired: "Este convite expirou ou foi revogado.",
    invite_invalid: "Código de convite inválido.",
    blocked: "Esta interação não está disponível.",
    forbidden: "Você não tem permissão para esta ação.",
    owner_cannot_leave:
      "O responsável deve excluir o Squad; a propriedade não pode ficar sem dono.",
    activity_not_visible: "Esta atividade não está mais disponível.",
  }).find(([code]) => message.includes(code));
  return match?.[1] ?? "Não foi possível concluir. Verifique sua conexão e tente novamente.";
};
