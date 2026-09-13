import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppScreen } from "@/components/app-screen";
import { ProfileAvatar } from "@/components/profile-avatar";
import {
  useCommunity,
  useCommunityMessages,
  useCommunityPublicProfile,
  useMessageActions,
  useOfficialChannelActions,
  useOfficialChannels,
} from "@/hooks/use-community";
import {
  communityErrorMessage,
  hasActiveOfficialMembership,
  isCommunityProfileReady,
  type ChatReaction,
  type CommunityMessage,
  type NotificationMode,
} from "@/lib/community";
import {
  clearComposerAfterSend,
  clearReplyAfterSend,
  createCommunityRequestId,
  createCommunitySendGate,
  reconcileCommunityMessages,
  type FailedCommunitySend,
} from "@/lib/community-message";
import { useLanguage } from "@/providers/language-provider";
import { colors, radius, shadows, spacing, typography } from "@/lib/theme";

const reactionOptions: { key: ChatReaction; emoji: string }[] = [
  { key: "clap", emoji: "👏" },
  { key: "fire", emoji: "🔥" },
  { key: "strong", emoji: "💪" },
  { key: "heart", emoji: "♥" },
];

const copy = {
  "pt-BR": {
    official: "KIVRYN • OFICIAL",
    members: "membros",
    connected: "Ao vivo",
    connecting: "Conectando…",
    disconnected: "Reconectando…",
    errorStatus: "Conexão instável",
    search: "Buscar nesta conversa",
    loadEarlier: "Carregar mensagens anteriores",
    loadingEarlier: "Carregando…",
    empty: "A conversa está pronta. Seja a primeira pessoa a falar por aqui.",
    reply: "Responder",
    profile: "Perfil",
    report: "Denunciar",
    block: "Bloquear",
    replyTo: "Respondendo a",
    cancelReply: "Cancelar resposta",
    placeholder: "Mensagem para a comunidade…",
    send: "Enviar",
    sending: "Enviando…",
    retry: "Tentar novamente",
    failed: "Não foi possível enviar esta mensagem.",
    profileNeeded: "Crie seu perfil da Comunidade para conversar.",
    createProfile: "Criar perfil",
    notifications: "Notificações",
    highlights: "Destaques",
    all: "Todas",
    muted: "Silenciado",
    aboutOfficial:
      "Mensagens oficiais são publicadas pela KIVRYN para iniciar conversas úteis. Elas nunca se passam por usuários reais.",
    memberProfile: "PERFIL DA COMUNIDADE",
    noBio: "Este membro ainda não adicionou uma bio.",
    privateSignals: "Os indicadores de progresso respeitam as preferências de privacidade deste perfil.",
    close: "Fechar",
    moderation: "MODERAÇÃO",
    reportConfirm: "Denunciar esta mensagem para revisão?",
    blockConfirm: "Bloquear este membro? As mensagens dele deixarão de aparecer para você.",
    cancel: "Cancelar",
    confirm: "Confirmar",
    removed: "Mensagem removida",
  },
  en: {
    official: "KIVRYN • OFFICIAL",
    members: "members",
    connected: "Live",
    connecting: "Connecting…",
    disconnected: "Reconnecting…",
    errorStatus: "Connection unstable",
    search: "Search this conversation",
    loadEarlier: "Load earlier messages",
    loadingEarlier: "Loading…",
    empty: "The conversation is ready. Be the first person to say something.",
    reply: "Reply",
    profile: "Profile",
    report: "Report",
    block: "Block",
    replyTo: "Replying to",
    cancelReply: "Cancel reply",
    placeholder: "Message the community…",
    send: "Send",
    sending: "Sending…",
    retry: "Try again",
    failed: "This message could not be sent.",
    profileNeeded: "Create your Community profile to chat.",
    createProfile: "Create profile",
    notifications: "Notifications",
    highlights: "Highlights",
    all: "All",
    muted: "Muted",
    aboutOfficial:
      "Official messages are posted by KIVRYN to start useful conversations. They never impersonate real users.",
    memberProfile: "COMMUNITY PROFILE",
    noBio: "This member has not added a bio yet.",
    privateSignals: "Progress signals respect this profile's privacy choices.",
    close: "Close",
    moderation: "MODERATION",
    reportConfirm: "Report this message for review?",
    blockConfirm: "Block this member? Their messages will stop appearing for you.",
    cancel: "Cancel",
    confirm: "Confirm",
    removed: "Message removed",
  },
} as const;

export default function CommunityChannelScreen() {
  const params = useLocalSearchParams<{ channelId?: string | string[] }>();
  const channelId = typeof params.channelId === "string" ? params.channelId : "";
  const { resolvedLocale } = useLanguage();
  const language = resolvedLocale?.startsWith("en") ? "en" : "pt-BR";
  const c = copy[language];
  const community = useCommunity();
  const channels = useOfficialChannels();
  const actions = useOfficialChannelActions();
  const messagesQuery = useCommunityMessages(channelId);
  const messageActions = useMessageActions(channelId);
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [replyTo, setReplyTo] = useState<CommunityMessage | null>(null);
  const [failedSend, setFailedSend] = useState<FailedCommunitySend | null>(null);
  const [sendError, setSendError] = useState("");
  const [selectedPublicId, setSelectedPublicId] = useState<string | null>(null);
  const [menuMessage, setMenuMessage] = useState<CommunityMessage | null>(null);
  const sendGate = useRef(createCommunitySendGate());
  const publicProfile = useCommunityPublicProfile(selectedPublicId);

  const channel = (channels.data ?? []).find((item) => item.id === channelId);
  const profileReady = isCommunityProfileReady(community.data?.profile);
  const messages = useMemo(
    () => reconcileCommunityMessages(messagesQuery.data?.pages ?? []),
    [messagesQuery.data?.pages],
  );
  const visibleMessages = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(language === "en" ? "en-US" : "pt-BR");
    if (!query) return messages;
    return messages.filter(
      (message) =>
        message.body.toLocaleLowerCase(language === "en" ? "en-US" : "pt-BR").includes(query) ||
        message.displayName.toLocaleLowerCase(language === "en" ? "en-US" : "pt-BR").includes(query),
    );
  }, [language, messages, search]);
  const messageById = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages]);

  const realtimeLabel =
    messagesQuery.realtimeStatus === "connected"
      ? c.connected
      : messagesQuery.realtimeStatus === "connecting"
        ? c.connecting
        : messagesQuery.realtimeStatus === "error"
          ? c.errorStatus
          : c.disconnected;

  const sendLogical = async (payload: FailedCommunitySend) => {
    if (!sendGate.current.acquire()) return;
    setSendError("");
    try {
      await messageActions.send.mutateAsync({
        body: payload.body,
        requestId: payload.requestId,
        replyToId: payload.replyToId,
      });
      setBody((current) => clearComposerAfterSend(current, payload.body));
      setReplyTo((current) => clearReplyAfterSend(current, payload.replyToId));
      setFailedSend((current) => (current?.requestId === payload.requestId ? null : current));
    } catch (error) {
      setFailedSend(payload);
      setSendError(communityErrorMessage(error));
    } finally {
      sendGate.current.release();
    }
  };

  const send = () => {
    const clean = body.trim();
    if (!clean || !profileReady) return;
    void sendLogical({
      body: clean,
      requestId: createCommunityRequestId(),
      replyToId: replyTo?.id ?? null,
    });
  };

  const react = (message: CommunityMessage, reaction: ChatReaction) => {
    const next = message.myReaction === reaction ? null : reaction;
    void messageActions.react.mutateAsync({ id: message.id, reaction: next });
  };

  const report = (message: CommunityMessage) => {
    Alert.alert(c.moderation, c.reportConfirm, [
      { text: c.cancel, style: "cancel" },
      {
        text: c.confirm,
        style: "destructive",
        onPress: () => void messageActions.report.mutateAsync(message.id).finally(() => setMenuMessage(null)),
      },
    ]);
  };

  const block = (message: CommunityMessage) => {
    Alert.alert(c.moderation, c.blockConfirm, [
      { text: c.cancel, style: "cancel" },
      {
        text: c.confirm,
        style: "destructive",
        onPress: () => void messageActions.block.mutateAsync(message.id).finally(() => setMenuMessage(null)),
      },
    ]);
  };

  const setNotification = (mode: NotificationMode) => {
    if (!channel) return;
    void actions.notifications.mutateAsync({ channel: channel.id, mode });
  };

  if (!channelId) {
    return (
      <AppScreen contentContainerStyle={s.centered}>
        <Text style={s.title}>{language === "en" ? "Community unavailable" : "Comunidade indisponível"}</Text>
        <Pressable onPress={() => router.replace("/community")}><Text style={s.link}>← Community</Text></Pressable>
      </AppScreen>
    );
  }

  if (channels.isPending || community.isPending) {
    return (
      <AppScreen contentContainerStyle={s.centered}>
        <Text style={s.eyebrow}>KIVRYN COMMUNITY</Text>
        <Text style={s.muted}>{c.connecting}</Text>
      </AppScreen>
    );
  }

  if (!channel || !hasActiveOfficialMembership(channel)) {
    return (
      <AppScreen contentContainerStyle={s.centered}>
        <Text style={s.title}>{channel?.name ?? "KIVRYN Community"}</Text>
        <Text style={s.muted}>
          {language === "en" ? "Join this community from the Community home first." : "Entre nesta comunidade pela tela principal da Comunidade primeiro."}
        </Text>
        <Pressable style={s.primaryButton} onPress={() => router.replace("/community")}>
          <Text style={s.primaryText}>Community</Text>
        </Pressable>
      </AppScreen>
    );
  }

  return (
    <>
      <AppScreen scroll keyboard contentContainerStyle={s.page}>
        <View style={[s.header, channel.premium && s.premiumHeader]}>
          <Pressable onPress={() => router.back()}>
            <Text style={s.back}>‹ Community</Text>
          </Pressable>
          <View style={s.headerTop}>
            <View style={s.flex}>
              <Text style={s.eyebrow}>{channel.premium ? "PREMIUM LOUNGE" : "COMMUNITY"}</Text>
              <Text style={s.title}>{channel.name}</Text>
              <Text style={s.muted}>{channel.memberCount} {c.members}</Text>
            </View>
            <View style={s.connectionPill}>
              <View style={[s.connectionDot, messagesQuery.realtimeStatus !== "connected" && s.connectionDotWaiting]} />
              <Text style={s.connectionText}>{realtimeLabel}</Text>
            </View>
          </View>
          <Text style={s.description}>{channel.description}</Text>
          <View style={s.notificationBlock}>
            <Text style={s.meta}>{c.notifications}</Text>
            <View style={s.notificationRow}>
              {(["highlights", "all", "muted"] as NotificationMode[]).map((mode) => {
                const label = mode === "highlights" ? c.highlights : mode === "all" ? c.all : c.muted;
                return (
                  <Pressable
                    key={mode}
                    style={[s.notificationChip, channel.notificationMode === mode && s.notificationChipActive]}
                    onPress={() => setNotification(mode)}
                  >
                    <Text style={[s.notificationText, channel.notificationMode === mode && s.notificationTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={s.officialNote}>
          <Text style={s.officialBadge}>{c.official}</Text>
          <Text style={s.noteText}>{c.aboutOfficial}</Text>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={c.search}
          placeholderTextColor={colors.textMuted}
          style={s.search}
        />

        {messagesQuery.hasNextPage ? (
          <Pressable
            style={s.loadEarlier}
            disabled={messagesQuery.isFetchingNextPage}
            onPress={() => void messagesQuery.fetchNextPage()}
          >
            <Text style={s.link}>{messagesQuery.isFetchingNextPage ? c.loadingEarlier : c.loadEarlier}</Text>
          </Pressable>
        ) : null}

        {messagesQuery.isError ? (
          <View style={s.errorCard}>
            <Text style={s.error}>{communityErrorMessage(messagesQuery.error)}</Text>
            <Pressable onPress={() => void messagesQuery.refetch()}><Text style={s.link}>{c.retry}</Text></Pressable>
          </View>
        ) : null}

        {!messagesQuery.isPending && visibleMessages.length === 0 ? (
          <View style={s.emptyCard}><Text style={s.muted}>{c.empty}</Text></View>
        ) : null}

        <View style={s.messages}>
          {visibleMessages.map((message) => {
            const parent = message.replyToId ? messageById.get(message.replyToId) : null;
            return (
              <View
                key={message.id}
                style={[
                  s.messageRow,
                  message.isSelf && s.messageRowSelf,
                  message.actorType === "system" && s.messageRowOfficial,
                ]}
              >
                {!message.isSelf && message.actorType === "user" ? (
                  <Pressable onPress={() => setSelectedPublicId(message.senderPublicId)}>
                    <ProfileAvatar imageUrl={message.avatarUrl} name={message.displayName} size={38} />
                  </Pressable>
                ) : message.actorType === "system" ? (
                  <View style={s.officialAvatar}><Text style={s.officialAvatarText}>K</Text></View>
                ) : null}
                <View style={[s.bubble, message.isSelf && s.bubbleSelf, message.actorType === "system" && s.bubbleOfficial]}>
                  <View style={s.messageHead}>
                    <Pressable
                      disabled={message.isSelf || message.actorType === "system"}
                      onPress={() => setSelectedPublicId(message.senderPublicId)}
                    >
                      <Text style={message.actorType === "system" ? s.officialName : s.messageName}>
                        {message.actorType === "system" ? c.official : message.isSelf ? (language === "en" ? "You" : "Você") : message.displayName}
                      </Text>
                    </Pressable>
                    <Text style={s.time}>
                      {new Date(message.createdAt).toLocaleTimeString(language === "en" ? "en-US" : "pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                  {parent ? (
                    <View style={s.replyPreview}>
                      <Text numberOfLines={1} style={s.replyName}>{parent.actorType === "system" ? c.official : parent.displayName}</Text>
                      <Text numberOfLines={1} style={s.replyBody}>{parent.body}</Text>
                    </View>
                  ) : null}
                  <Text style={[s.messageBody, message.removed && s.removed]}>{message.removed ? c.removed : message.body}</Text>
                  {!message.removed ? (
                    <View style={s.reactions}>
                      {reactionOptions.map(({ key, emoji }) => {
                        const count = message.reactions[key] ?? 0;
                        return (
                          <Pressable
                            key={key}
                            style={[s.reactionChip, message.myReaction === key && s.reactionChipActive]}
                            onPress={() => react(message, key)}
                          >
                            <Text style={s.reactionText}>{emoji}{count ? ` ${count}` : ""}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                  {!message.removed && message.actorType === "user" ? (
                    <View style={s.messageActions}>
                      <Pressable onPress={() => setReplyTo(message)}><Text style={s.actionText}>{c.reply}</Text></Pressable>
                      {!message.isSelf ? (
                        <>
                          <Pressable onPress={() => setSelectedPublicId(message.senderPublicId)}><Text style={s.actionText}>{c.profile}</Text></Pressable>
                          <Pressable onPress={() => setMenuMessage(message)}><Text style={s.actionText}>•••</Text></Pressable>
                        </>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {!profileReady ? (
          <View style={s.profileNeeded}>
            <Text style={s.cardTitle}>{c.profileNeeded}</Text>
            <Pressable style={s.primaryButton} onPress={() => router.push("/community")}>
              <Text style={s.primaryText}>{c.createProfile}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.composerBlock}>
            {replyTo ? (
              <View style={s.replyingBox}>
                <View style={s.flex}>
                  <Text style={s.meta}>{c.replyTo} {replyTo.displayName}</Text>
                  <Text numberOfLines={1} style={s.replyBody}>{replyTo.body}</Text>
                </View>
                <Pressable onPress={() => setReplyTo(null)}><Text style={s.link}>×</Text></Pressable>
              </View>
            ) : null}
            {failedSend ? (
              <View style={s.failedCard}>
                <Text style={s.error}>{sendError || c.failed}</Text>
                <Pressable onPress={() => void sendLogical(failedSend)}><Text style={s.link}>{c.retry}</Text></Pressable>
              </View>
            ) : null}
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={c.placeholder}
              placeholderTextColor={colors.textMuted}
              style={s.composer}
              multiline
              maxLength={1200}
            />
            <View style={s.composerFooter}>
              <Text style={s.counter}>{body.trim().length}/1200</Text>
              <Pressable
                style={[s.sendButton, (!body.trim() || messageActions.send.isPending) && s.sendButtonDisabled]}
                disabled={!body.trim() || messageActions.send.isPending}
                onPress={send}
              >
                <Text style={s.primaryText}>{messageActions.send.isPending ? c.sending : c.send}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </AppScreen>

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(selectedPublicId)}
        onRequestClose={() => setSelectedPublicId(null)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setSelectedPublicId(null)}>
          <Pressable style={s.profileModal} onPress={() => undefined}>
            <Text style={s.eyebrow}>{c.memberProfile}</Text>
            {publicProfile.isPending ? (
              <Text style={s.muted}>{c.connecting}</Text>
            ) : publicProfile.data ? (
              <>
                <ProfileAvatar imageUrl={publicProfile.data.avatarUrl} name={publicProfile.data.displayName} size={76} />
                <Text style={s.profileModalName}>{publicProfile.data.displayName}</Text>
                <Text style={s.handle}>@{publicProfile.data.username}</Text>
                <Text style={s.profileBio}>{publicProfile.data.bio || c.noBio}</Text>
                <View style={s.profileSignals}>
                  {publicProfile.data.showMomentum ? <Text style={s.signal}>Momentum ✓</Text> : null}
                  {publicProfile.data.showStreak ? <Text style={s.signal}>{language === "en" ? "Streak" : "Sequência"} ✓</Text> : null}
                  {publicProfile.data.showVerifiedActivity ? <Text style={s.signal}>{language === "en" ? "Verified activity" : "Atividade verificada"} ✓</Text> : null}
                </View>
                <Text style={s.privacy}>{c.privateSignals}</Text>
              </>
            ) : (
              <Text style={s.muted}>{language === "en" ? "Profile unavailable." : "Perfil indisponível."}</Text>
            )}
            <Pressable style={s.outlineButton} onPress={() => setSelectedPublicId(null)}>
              <Text style={s.outlineText}>{c.close}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent animationType="fade" visible={Boolean(menuMessage)} onRequestClose={() => setMenuMessage(null)}>
        <Pressable style={s.modalBackdrop} onPress={() => setMenuMessage(null)}>
          <Pressable style={s.actionModal} onPress={() => undefined}>
            <Text style={s.eyebrow}>{c.moderation}</Text>
            <Pressable style={s.modalAction} onPress={() => menuMessage && report(menuMessage)}>
              <Text style={s.warningAction}>{c.report}</Text>
            </Pressable>
            <Pressable style={s.modalAction} onPress={() => menuMessage && block(menuMessage)}>
              <Text style={s.dangerAction}>{c.block}</Text>
            </Pressable>
            <Pressable style={s.modalAction} onPress={() => setMenuMessage(null)}>
              <Text style={s.link}>{c.cancel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  page: { gap: spacing.lg, paddingBottom: spacing.xxl },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg },
  header: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderActive, backgroundColor: colors.canvasElevated, ...shadows.illuminated },
  premiumHeader: { borderColor: colors.violet },
  back: { ...typography.label, color: colors.textMuted },
  headerTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  title: { ...typography.title, color: colors.text },
  cardTitle: { ...typography.heading, color: colors.text },
  muted: { ...typography.body, color: colors.textMuted },
  description: { ...typography.body, color: colors.textSecondary },
  meta: { ...typography.caption, color: colors.textMuted },
  connectionPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.surface },
  connectionDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: colors.success },
  connectionDotWaiting: { backgroundColor: colors.warning },
  connectionText: { ...typography.caption, color: colors.textSecondary },
  notificationBlock: { gap: spacing.sm },
  notificationRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  notificationChip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  notificationChipActive: { borderColor: colors.primaryBright, backgroundColor: colors.accentMuted },
  notificationText: { ...typography.caption, color: colors.textMuted },
  notificationTextActive: { color: colors.primaryBright },
  officialNote: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  officialBadge: { ...typography.eyebrow, color: colors.primaryBright },
  noteText: { ...typography.caption, color: colors.textMuted },
  search: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: colors.surface, color: colors.text, ...typography.body },
  loadEarlier: { alignItems: "center", paddingVertical: spacing.sm },
  link: { ...typography.label, color: colors.primaryBright },
  errorCard: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.surface },
  error: { ...typography.body, color: colors.danger },
  emptyCard: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface },
  messages: { gap: spacing.md },
  messageRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingRight: spacing.xl },
  messageRowSelf: { justifyContent: "flex-end", paddingRight: 0, paddingLeft: spacing.xl },
  messageRowOfficial: { paddingRight: 0 },
  officialAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.primaryBright, backgroundColor: colors.accentMuted },
  officialAvatarText: { ...typography.label, color: colors.primaryBright },
  bubble: { flexShrink: 1, maxWidth: "88%", gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  bubbleSelf: { backgroundColor: colors.accentMuted, borderColor: colors.borderActive },
  bubbleOfficial: { maxWidth: "100%", backgroundColor: colors.surfaceRaised, borderColor: colors.primary },
  messageHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  messageName: { ...typography.label, color: colors.text },
  officialName: { ...typography.eyebrow, color: colors.primaryBright },
  time: { ...typography.caption, color: colors.textMuted },
  messageBody: { ...typography.body, color: colors.text },
  removed: { color: colors.textMuted, fontStyle: "italic" },
  replyPreview: { gap: 2, padding: spacing.sm, borderLeftWidth: 2, borderLeftColor: colors.primaryBright, backgroundColor: colors.canvasElevated, borderRadius: radius.sm },
  replyName: { ...typography.caption, color: colors.primaryBright },
  replyBody: { ...typography.caption, color: colors.textMuted },
  reactions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  reactionChip: { minWidth: 34, minHeight: 30, alignItems: "center", justifyContent: "center", paddingHorizontal: 7, borderRadius: radius.pill, backgroundColor: colors.canvasElevated },
  reactionChipActive: { borderWidth: 1, borderColor: colors.primaryBright, backgroundColor: colors.accentMuted },
  reactionText: { fontSize: 14, color: colors.text },
  messageActions: { flexDirection: "row", gap: spacing.md },
  actionText: { ...typography.caption, color: colors.textMuted },
  profileNeeded: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderActive, backgroundColor: colors.surfaceRaised },
  composerBlock: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderActive, backgroundColor: colors.surfaceRaised, ...shadows.raised },
  replyingBox: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.canvasElevated },
  failedCard: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, padding: spacing.sm, borderRadius: radius.md, backgroundColor: "rgba(255,123,134,0.08)" },
  composer: { minHeight: 82, maxHeight: 160, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.canvasElevated, color: colors.text, textAlignVertical: "top", ...typography.body },
  composerFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  counter: { ...typography.caption, color: colors.textMuted },
  sendButton: { minWidth: 100, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  sendButtonDisabled: { opacity: 0.45 },
  primaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary },
  primaryText: { ...typography.label, color: colors.text },
  modalBackdrop: { flex: 1, justifyContent: "center", padding: spacing.lg, backgroundColor: "rgba(0,0,0,0.74)" },
  profileModal: { gap: spacing.md, alignItems: "center", padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderActive, backgroundColor: colors.surfaceRaised },
  profileModalName: { ...typography.title, color: colors.text, textAlign: "center" },
  handle: { ...typography.label, color: colors.primaryBright },
  profileBio: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  profileSignals: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
  signal: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: 9, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.canvasElevated },
  privacy: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
  outlineButton: { minHeight: 46, alignItems: "center", justifyContent: "center", alignSelf: "stretch", borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderActive },
  outlineText: { ...typography.label, color: colors.primaryBright },
  actionModal: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
  modalAction: { minHeight: 48, justifyContent: "center", paddingHorizontal: spacing.sm },
  warningAction: { ...typography.label, color: colors.warning },
  dangerAction: { ...typography.label, color: colors.danger },
});
