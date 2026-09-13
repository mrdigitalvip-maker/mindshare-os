import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { AppScreen } from "@/components/app-screen";
import { ProfileAvatar } from "@/components/profile-avatar";
import {
  useAcceptInvite,
  useCommunity,
  useCreateSquad,
  useOfficialChannelActions,
  useOfficialChannels,
  useSaveCommunityProfile,
} from "@/hooks/use-community";
import {
  communityErrorMessage,
  hasActiveOfficialMembership,
  isCommunityProfileReady,
  type CommunityProfile,
  type NotificationMode,
  type OfficialChannel,
} from "@/lib/community";
import { useLanguage } from "@/providers/language-provider";
import { colors, radius, shadows, spacing, typography } from "@/lib/theme";

const copy = {
  "pt-BR": {
    eyebrow: "KIVRYN COMMUNITY",
    title: "Pessoas reais. Conversas reais. Progresso compartilhado.",
    subtitle:
      "Entre, converse sobre o dia, tarefas, estudos, projetos e criação. Mensagens oficiais da KIVRYN aparecem sempre identificadas como OFICIAL.",
    real: "REDE AO VIVO",
    profileGate: "Crie sua identidade na Comunidade",
    profileGateCopy:
      "Este perfil é separado da sua conta privada. Outros membros verão somente nome, @username, bio e o que você escolher compartilhar.",
    displayName: "Nome que os membros verão",
    username: "username",
    bio: "Bio curta — sobre você, foco ou o que está construindo",
    createProfile: "Criar perfil e entrar",
    saving: "Salvando…",
    profileTitle: "SEU PERFIL NA COMUNIDADE",
    edit: "Editar perfil",
    save: "Salvar perfil",
    cancel: "Cancelar",
    privacy: "PRIVACIDADE DO PERFIL",
    momentum: "Mostrar Momentum",
    streak: "Mostrar sequência",
    activity: "Mostrar atividade verificada",
    noEmail: "Seu e-mail e ID da conta nunca aparecem para outros membros.",
    spaces: "COMUNIDADES DISPONÍVEIS",
    basic: "BÁSICO",
    premium: "PREMIUM",
    members: "membros",
    unread: "não lidas",
    join: "Entrar na comunidade",
    open: "Abrir conversa",
    locked: "Disponível com KIVRYN Premium",
    upgrade: "Ver Premium",
    recent: "Última conversa",
    noMessages: "A conversa começa com os membros.",
    notification: "Notificações",
    highlights: "Destaques",
    all: "Todas",
    muted: "Silenciado",
    circles: "CÍRCULOS PRIVADOS",
    circlesCopy: "Grupos menores por convite para acompanhar pessoas próximas sem expor sua conta.",
    createCircle: "Criar círculo",
    circleName: "Nome do círculo",
    circleDescription: "Descrição opcional",
    create: "Criar",
    invite: "Entrar com convite",
    inviteCode: "Código do convite",
    enter: "Entrar",
    noCircles: "Você ainda não participa de nenhum círculo privado.",
    people: "pessoas",
    activityTitle: "ATIVIDADE DA SUA REDE",
    activityEmpty: "Quando membros compartilharem progresso verificado, ele aparecerá aqui.",
    refresh: "Atualizar",
    error: "Não foi possível sincronizar a Comunidade.",
    mission: "Missão concluída",
    challenge: "Desafio concluído",
  },
  en: {
    eyebrow: "KIVRYN COMMUNITY",
    title: "Real people. Real conversations. Shared progress.",
    subtitle:
      "Join conversations about the day, tasks, studies, projects and creation. Official KIVRYN messages are always clearly labeled OFFICIAL.",
    real: "LIVE NETWORK",
    profileGate: "Create your Community identity",
    profileGateCopy:
      "This profile is separate from your private account. Members only see your name, @username, bio and what you choose to share.",
    displayName: "Name members will see",
    username: "username",
    bio: "Short bio — about you, your focus or what you are building",
    createProfile: "Create profile and join",
    saving: "Saving…",
    profileTitle: "YOUR COMMUNITY PROFILE",
    edit: "Edit profile",
    save: "Save profile",
    cancel: "Cancel",
    privacy: "PROFILE PRIVACY",
    momentum: "Show Momentum",
    streak: "Show streak",
    activity: "Show verified activity",
    noEmail: "Your email and account ID are never shown to other members.",
    spaces: "AVAILABLE COMMUNITIES",
    basic: "BASIC",
    premium: "PREMIUM",
    members: "members",
    unread: "unread",
    join: "Join community",
    open: "Open conversation",
    locked: "Available with KIVRYN Premium",
    upgrade: "View Premium",
    recent: "Latest conversation",
    noMessages: "The conversation starts with members.",
    notification: "Notifications",
    highlights: "Highlights",
    all: "All",
    muted: "Muted",
    circles: "PRIVATE CIRCLES",
    circlesCopy: "Smaller invite-only groups for people you know without exposing your account.",
    createCircle: "Create circle",
    circleName: "Circle name",
    circleDescription: "Optional description",
    create: "Create",
    invite: "Join with invite",
    inviteCode: "Invite code",
    enter: "Join",
    noCircles: "You are not in any private circles yet.",
    people: "people",
    activityTitle: "YOUR NETWORK ACTIVITY",
    activityEmpty: "Verified progress shared by members will appear here.",
    refresh: "Refresh",
    error: "Community could not sync.",
    mission: "Mission completed",
    challenge: "Challenge completed",
  },
} as const;

const emptyProfile = (): CommunityProfile => ({
  displayName: "",
  username: "",
  avatarUrl: null,
  bio: "",
  visibility: "community",
  showMomentum: false,
  showStreak: false,
  showVerifiedActivity: false,
});

export default function CommunityHomeScreen() {
  const { resolvedLocale } = useLanguage();
  const language = resolvedLocale?.startsWith("en") ? "en" : "pt-BR";
  const c = copy[language];
  const community = useCommunity();
  const channels = useOfficialChannels();
  const channelActions = useOfficialChannelActions();
  const saveProfile = useSaveCommunityProfile();
  const createCircle = useCreateSquad();
  const acceptInvite = useAcceptInvite();
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<CommunityProfile>(emptyProfile());
  const [profileError, setProfileError] = useState("");
  const [circleOpen, setCircleOpen] = useState(false);
  const [circleName, setCircleName] = useState("");
  const [circleDescription, setCircleDescription] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [actionError, setActionError] = useState("");

  const profile = community.data?.profile ?? null;
  const profileReady = isCommunityProfileReady(profile);
  const draft = editingProfile || !profileReady ? profileDraft : profile ?? emptyProfile();
  const orderedChannels = useMemo(
    () => [...(channels.data ?? [])].sort((a, b) => Number(a.premium) - Number(b.premium)),
    [channels.data],
  );

  const beginProfile = () => {
    setProfileDraft(
      profile
        ? { ...profile, visibility: "community" }
        : emptyProfile(),
    );
    setProfileError("");
    setEditingProfile(true);
  };

  const persistProfile = async () => {
    const next = {
      ...draft,
      displayName: draft.displayName?.trim() ?? "",
      username: draft.username?.trim().replace(/^@/, "").toLowerCase() ?? "",
      bio: draft.bio?.trim() ?? "",
      visibility: "community" as const,
    };
    if (!next.displayName || !next.username) {
      setProfileError(language === "en" ? "Name and username are required." : "Nome e username são obrigatórios.");
      return;
    }
    setProfileError("");
    try {
      await saveProfile.mutateAsync(next);
      setEditingProfile(false);
      setProfileDraft(next);
    } catch (error) {
      setProfileError(communityErrorMessage(error));
    }
  };

  const join = async (channel: OfficialChannel) => {
    setActionError("");
    if (!profileReady) {
      beginProfile();
      return;
    }
    if (!channel.eligible) {
      router.push("/premium");
      return;
    }
    try {
      if (!hasActiveOfficialMembership(channel)) await channelActions.join.mutateAsync(channel.id);
      router.push(`/community/${channel.id}`);
    } catch (error) {
      setActionError(communityErrorMessage(error));
    }
  };

  const changeNotifications = async (channel: OfficialChannel, mode: NotificationMode) => {
    setActionError("");
    try {
      await channelActions.notifications.mutateAsync({ channel: channel.id, mode });
    } catch (error) {
      setActionError(communityErrorMessage(error));
    }
  };

  const refresh = async () => {
    setActionError("");
    await Promise.allSettled([community.refetch(), channels.refetch()]);
  };

  if (community.isPending || channels.isPending) {
    return (
      <AppScreen contentContainerStyle={s.centered}>
        <Text style={s.eyebrow}>{c.eyebrow}</Text>
        <Text style={s.muted}>{language === "en" ? "Connecting your network…" : "Conectando sua rede…"}</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll keyboard contentContainerStyle={s.page}>
      <View style={s.hero}>
        <View style={s.heroTop}>
          <Text style={s.eyebrow}>{c.eyebrow}</Text>
          <View style={s.livePill}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>{c.real}</Text>
          </View>
        </View>
        <Text style={s.title}>{c.title}</Text>
        <Text style={s.heroCopy}>{c.subtitle}</Text>
      </View>

      {!profileReady || editingProfile ? (
        <View style={s.profileGate}>
          <Text style={s.eyebrow}>{c.profileGate}</Text>
          <Text style={s.cardTitle}>{c.profileGateCopy}</Text>
          <View style={s.avatarPreview}>
            <ProfileAvatar imageUrl={draft.avatarUrl} name={draft.displayName || draft.username} size={70} />
          </View>
          <TextInput
            value={draft.displayName ?? ""}
            onChangeText={(displayName) => setProfileDraft((value) => ({ ...value, displayName }))}
            placeholder={c.displayName}
            placeholderTextColor={colors.textMuted}
            style={s.input}
            maxLength={60}
          />
          <View style={s.usernameInputRow}>
            <Text style={s.at}>@</Text>
            <TextInput
              value={draft.username ?? ""}
              onChangeText={(username) =>
                setProfileDraft((value) => ({
                  ...value,
                  username: username.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase(),
                }))
              }
              placeholder={c.username}
              placeholderTextColor={colors.textMuted}
              style={s.usernameInput}
              autoCapitalize="none"
              maxLength={29}
            />
          </View>
          <TextInput
            value={draft.bio ?? ""}
            onChangeText={(bio) => setProfileDraft((value) => ({ ...value, bio }))}
            placeholder={c.bio}
            placeholderTextColor={colors.textMuted}
            style={[s.input, s.bioInput]}
            multiline
            maxLength={240}
          />
          <Text style={s.eyebrow}>{c.privacy}</Text>
          <PrivacyToggle
            label={c.momentum}
            value={draft.showMomentum}
            onPress={() => setProfileDraft((value) => ({ ...value, showMomentum: !value.showMomentum }))}
          />
          <PrivacyToggle
            label={c.streak}
            value={draft.showStreak}
            onPress={() => setProfileDraft((value) => ({ ...value, showStreak: !value.showStreak }))}
          />
          <PrivacyToggle
            label={c.activity}
            value={draft.showVerifiedActivity}
            onPress={() =>
              setProfileDraft((value) => ({ ...value, showVerifiedActivity: !value.showVerifiedActivity }))
            }
          />
          <Text style={s.privacyNote}>{c.noEmail}</Text>
          {profileError ? <Text style={s.error}>{profileError}</Text> : null}
          <Pressable style={s.primaryButton} disabled={saveProfile.isPending} onPress={() => void persistProfile()}>
            <Text style={s.primaryText}>
              {saveProfile.isPending ? c.saving : profileReady ? c.save : c.createProfile}
            </Text>
          </Pressable>
          {profileReady ? (
            <Pressable onPress={() => setEditingProfile(false)}>
              <Text style={s.centerLink}>{c.cancel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={s.profileCard}>
          <Text style={s.eyebrow}>{c.profileTitle}</Text>
          <View style={s.profileRow}>
            <ProfileAvatar imageUrl={profile?.avatarUrl} name={profile?.displayName} size={58} />
            <View style={s.flex}>
              <Text style={s.cardTitle}>{profile?.displayName}</Text>
              <Text style={s.handle}>@{profile?.username}</Text>
              {profile?.bio ? <Text style={s.muted}>{profile.bio}</Text> : null}
            </View>
          </View>
          <Pressable style={s.outlineButton} onPress={beginProfile}>
            <Text style={s.outlineText}>{c.edit}</Text>
          </Pressable>
        </View>
      )}

      <View style={s.sectionHeader}>
        <Text style={s.eyebrow}>{c.spaces}</Text>
        <Pressable onPress={() => void refresh()}>
          <Text style={s.link}>{c.refresh}</Text>
        </Pressable>
      </View>
      {community.isError || channels.isError ? <Text style={s.error}>{c.error}</Text> : null}
      {actionError ? <Text style={s.error}>{actionError}</Text> : null}

      {orderedChannels.map((channel) => (
        <ChannelCard
          key={channel.id}
          channel={channel}
          c={c}
          profileReady={profileReady}
          language={language}
          busy={channelActions.join.isPending || channelActions.notifications.isPending}
          onOpen={() => void join(channel)}
          onNotifications={(mode) => void changeNotifications(channel, mode)}
        />
      ))}

      <View style={s.sectionBlock}>
        <Text style={s.eyebrow}>{c.circles}</Text>
        <Text style={s.muted}>{c.circlesCopy}</Text>
        <View style={s.twoButtons}>
          <Pressable style={s.smallOutline} onPress={() => setCircleOpen((value) => !value)}>
            <Text style={s.outlineText}>{c.createCircle}</Text>
          </Pressable>
          <Pressable style={s.smallOutline} onPress={() => setInviteOpen((value) => !value)}>
            <Text style={s.outlineText}>{c.invite}</Text>
          </Pressable>
        </View>
        {circleOpen ? (
          <View style={s.inlineForm}>
            <TextInput
              value={circleName}
              onChangeText={setCircleName}
              placeholder={c.circleName}
              placeholderTextColor={colors.textMuted}
              style={s.input}
              maxLength={60}
            />
            <TextInput
              value={circleDescription}
              onChangeText={setCircleDescription}
              placeholder={c.circleDescription}
              placeholderTextColor={colors.textMuted}
              style={s.input}
              maxLength={240}
            />
            <Pressable
              style={s.primaryButton}
              disabled={!circleName.trim() || createCircle.isPending}
              onPress={() =>
                void createCircle
                  .mutateAsync({ name: circleName, description: circleDescription })
                  .then(() => {
                    setCircleName("");
                    setCircleDescription("");
                    setCircleOpen(false);
                  })
                  .catch((error) => setActionError(communityErrorMessage(error)))
              }
            >
              <Text style={s.primaryText}>{c.create}</Text>
            </Pressable>
          </View>
        ) : null}
        {inviteOpen ? (
          <View style={s.inlineForm}>
            <TextInput
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder={c.inviteCode}
              placeholderTextColor={colors.textMuted}
              style={s.input}
              autoCapitalize="characters"
              maxLength={16}
            />
            <Pressable
              style={s.primaryButton}
              disabled={!inviteCode.trim() || acceptInvite.isPending}
              onPress={() =>
                void acceptInvite
                  .mutateAsync(inviteCode)
                  .then(() => {
                    setInviteCode("");
                    setInviteOpen(false);
                  })
                  .catch((error) => setActionError(communityErrorMessage(error)))
              }
            >
              <Text style={s.primaryText}>{c.enter}</Text>
            </Pressable>
          </View>
        ) : null}
        {community.data?.squads.length ? (
          community.data.squads.map((circle) => (
            <Pressable
              key={circle.id}
              style={s.circleCard}
              onPress={() => router.push(`/community/squads/${circle.id}`)}
            >
              <View style={s.flex}>
                <Text style={s.cardTitle}>{circle.name}</Text>
                {circle.description ? <Text style={s.muted}>{circle.description}</Text> : null}
                <Text style={s.meta}>{circle.memberCount} {c.people} · {circle.role}</Text>
              </View>
              <Text style={s.arrow}>›</Text>
            </Pressable>
          ))
        ) : (
          <Text style={s.muted}>{c.noCircles}</Text>
        )}
      </View>

      <View style={s.sectionBlock}>
        <Text style={s.eyebrow}>{c.activityTitle}</Text>
        {community.data?.activity.length ? (
          community.data.activity.slice(0, 8).map((item) => (
            <View key={item.id} style={s.activityRow}>
              <ProfileAvatar imageUrl={item.avatarUrl} name={item.displayName} size={40} />
              <View style={s.flex}>
                <Text style={s.activityName}>{item.displayName}</Text>
                <Text style={s.muted}>
                  {item.eventType === "mission_completed" ? c.mission : c.challenge} · {new Date(item.occurredAt).toLocaleDateString(language === "en" ? "en-US" : "pt-BR")}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={s.muted}>{c.activityEmpty}</Text>
        )}
      </View>
    </AppScreen>
  );
}

function ChannelCard({
  channel,
  c,
  profileReady,
  language,
  busy,
  onOpen,
  onNotifications,
}: {
  channel: OfficialChannel;
  c: (typeof copy)["pt-BR"] | (typeof copy)["en"];
  profileReady: boolean;
  language: "pt-BR" | "en";
  busy: boolean;
  onOpen(): void;
  onNotifications(mode: NotificationMode): void;
}) {
  const active = hasActiveOfficialMembership(channel);
  const notificationLabels: Record<NotificationMode, string> = {
    highlights: c.highlights,
    all: c.all,
    muted: c.muted,
  };
  return (
    <View style={[s.channelCard, channel.premium && s.premiumCard]}>
      <View style={s.channelHeader}>
        <View style={s.flex}>
          <View style={s.badgeRow}>
            <Text style={[s.planBadge, channel.premium && s.premiumBadge]}>
              {channel.premium ? c.premium : c.basic}
            </Text>
            <Text style={s.memberCount}>{channel.memberCount} {c.members}</Text>
            {channel.unreadCount > 0 ? <Text style={s.unreadBadge}>{channel.unreadCount} {c.unread}</Text> : null}
          </View>
          <Text style={s.channelTitle}>{channel.name}</Text>
          <Text style={s.muted}>{channel.description}</Text>
        </View>
      </View>
      <View style={s.recentBox}>
        <Text style={s.meta}>{c.recent}</Text>
        <Text numberOfLines={2} style={s.recentText}>{channel.recentBody ?? c.noMessages}</Text>
        {channel.recentAt ? (
          <Text style={s.meta}>{new Date(channel.recentAt).toLocaleString(language === "en" ? "en-US" : "pt-BR")}</Text>
        ) : null}
      </View>
      {!channel.eligible ? (
        <>
          <Text style={s.locked}>{c.locked}</Text>
          <Pressable style={s.premiumButton} onPress={() => router.push("/premium")}>
            <Text style={s.primaryText}>{c.upgrade}</Text>
          </Pressable>
        </>
      ) : (
        <Pressable style={s.primaryButton} disabled={busy} onPress={onOpen}>
          <Text style={s.primaryText}>{active ? c.open : profileReady ? c.join : c.createProfile}</Text>
        </Pressable>
      )}
      {active ? (
        <View style={s.notificationBlock}>
          <Text style={s.meta}>{c.notification}</Text>
          <View style={s.notificationRow}>
            {(["highlights", "all", "muted"] as NotificationMode[]).map((mode) => (
              <Pressable
                key={mode}
                style={[s.notificationChip, channel.notificationMode === mode && s.notificationChipActive]}
                onPress={() => onNotifications(mode)}
              >
                <Text style={[s.notificationText, channel.notificationMode === mode && s.notificationTextActive]}>
                  {notificationLabels[mode]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function PrivacyToggle({ label, value, onPress }: { label: string; value: boolean; onPress(): void }) {
  return (
    <Pressable style={s.toggleRow} onPress={onPress}>
      <Text style={s.toggleLabel}>{label}</Text>
      <View style={[s.toggle, value && s.toggleActive]}>
        <View style={[s.toggleKnob, value && s.toggleKnobActive]} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  page: { gap: spacing.lg, paddingBottom: spacing.xxl },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  hero: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.canvasElevated,
    ...shadows.illuminated,
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  title: { ...typography.title, color: colors.text },
  heroCopy: { ...typography.body, color: colors.textSecondary },
  livePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.accentMuted },
  liveDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: colors.success },
  liveText: { ...typography.caption, color: colors.textSecondary },
  profileGate: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderActive, backgroundColor: colors.surfaceRaised, ...shadows.raised },
  profileCard: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  avatarPreview: { alignItems: "center", paddingVertical: spacing.sm },
  profileRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  cardTitle: { ...typography.heading, color: colors.text },
  handle: { ...typography.label, color: colors.primaryBright },
  muted: { ...typography.body, color: colors.textMuted },
  meta: { ...typography.caption, color: colors.textMuted },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.canvasElevated, ...typography.body },
  bioInput: { minHeight: 88, paddingTop: spacing.md, textAlignVertical: "top" },
  usernameInputRow: { minHeight: 50, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.canvasElevated, paddingHorizontal: spacing.md },
  at: { ...typography.body, color: colors.primaryBright },
  usernameInput: { flex: 1, color: colors.text, ...typography.body, paddingVertical: 0 },
  privacyNote: { ...typography.caption, color: colors.textMuted },
  toggleRow: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  toggleLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  toggle: { width: 44, height: 26, borderRadius: radius.pill, padding: 3, backgroundColor: colors.overlay },
  toggleActive: { backgroundColor: colors.accentMuted, borderWidth: 1, borderColor: colors.primary },
  toggleKnob: { width: 20, height: 20, borderRadius: 20, backgroundColor: colors.textMuted },
  toggleKnobActive: { alignSelf: "flex-end", backgroundColor: colors.primaryBright },
  primaryButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.primary },
  primaryText: { ...typography.label, color: colors.text },
  outlineButton: { minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderActive },
  outlineText: { ...typography.label, color: colors.primaryBright },
  centerLink: { ...typography.label, color: colors.textMuted, textAlign: "center", paddingVertical: spacing.sm },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  link: { ...typography.label, color: colors.primaryBright },
  error: { ...typography.body, color: colors.danger },
  channelCard: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.raised },
  premiumCard: { borderColor: colors.violet },
  channelHeader: { flexDirection: "row", gap: spacing.md },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  planBadge: { ...typography.eyebrow, color: colors.primaryBright, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.accentMuted },
  premiumBadge: { color: colors.text, backgroundColor: "rgba(139,124,246,0.18)" },
  memberCount: { ...typography.caption, color: colors.textSecondary },
  unreadBadge: { ...typography.caption, color: colors.background, backgroundColor: colors.primaryBright, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  channelTitle: { ...typography.title, color: colors.text },
  recentBox: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.canvasElevated },
  recentText: { ...typography.body, color: colors.textSecondary },
  locked: { ...typography.label, color: colors.warning },
  premiumButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.violet },
  notificationBlock: { gap: spacing.sm },
  notificationRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  notificationChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  notificationChipActive: { borderColor: colors.primaryBright, backgroundColor: colors.accentMuted },
  notificationText: { ...typography.caption, color: colors.textMuted },
  notificationTextActive: { color: colors.primaryBright },
  sectionBlock: { gap: spacing.md, paddingTop: spacing.sm },
  twoButtons: { flexDirection: "row", gap: spacing.sm },
  smallOutline: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  inlineForm: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  circleCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  arrow: { fontSize: 28, color: colors.primaryBright },
  activityRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  activityName: { ...typography.label, color: colors.text },
  flex: { flex: 1, gap: spacing.xs },
});
