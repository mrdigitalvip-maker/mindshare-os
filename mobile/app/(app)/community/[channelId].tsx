import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  useCommunityMessages,
  useMessageActions,
  useOfficialChannelActions,
  useOfficialChannels,
} from "@/hooks/use-community";
import {
  communityErrorMessage,
  hasActiveOfficialMembership,
  type ChatReaction,
  type CommunityMessage,
  type NotificationMode,
} from "@/lib/community";
import {
  createCommunityRequestId,
  createCommunitySendGate,
  clearComposerAfterSend,
  clearFailedAfterSend,
  clearReplyAfterSend,
  reconcileCommunityMessages,
} from "@/lib/community-message";
import {
  formatMessageDate,
  initials,
  copyCommunityText,
  messageActions,
  withDateSeparators,
} from "@/lib/community-ui";
import { colors, radius, spacing, typography } from "@/lib/theme";

const reactionLabels: Record<ChatReaction, string> = {
  heart: "❤️",
  fire: "🔥",
  clap: "👏",
  strong: "💪",
};
const truncate = (body: string) => (body.length > 72 ? `${body.slice(0, 72)}…` : body);

export default function CommunityConversation() {
  const params = useLocalSearchParams<{ channelId?: string | string[] }>();
  const channelId = typeof params.channelId === "string" ? params.channelId.trim() : "";
  if (!channelId) return <UnavailableChannel />;
  return <CommunityConversationContent channelId={channelId} />;
}

function UnavailableChannel() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.title}>NEXORA Community</Text>
        <Text style={styles.muted}>Esta conversa não está disponível.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace("/community")}>
          <Text style={styles.link}>Voltar para Community</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CommunityConversationContent({ channelId }: { channelId: string }) {
  const messages = useCommunityMessages(channelId),
    actions = useMessageActions(channelId),
    channelActions = useOfficialChannelActions(),
    channels = useOfficialChannels();
  const list = useRef<FlatList>(null),
    nearBottom = useRef(true),
    didInitialScroll = useRef(false),
    sending = useRef(createCommunitySendGate()),
    reacting = useRef(new Set<string>()),
    reporting = useRef(new Set<string>());
  const [body, setBody] = useState("");
  const [sendInFlight, setSendInFlight] = useState(false);
  const [failed, setFailed] = useState<{
    body: string;
    requestId: string;
    replyToId: string | null;
  } | null>(null);
  const [reply, setReply] = useState<CommunityMessage | null>(null);
  const [selected, setSelected] = useState<CommunityMessage | null>(null);
  const [showNew, setShowNew] = useState(false);
  const channel = channels.data?.find((item) => item.id === channelId);
  const messagesOnly = useMemo(
    () => reconcileCommunityMessages(messages.data?.pages ?? []),
    [messages.data],
  );
  const rows = useMemo(() => withDateSeparators(messagesOnly), [messagesOnly]);
  const byId = useMemo(
    () => new Map(messagesOnly.map((message) => [message.id, message])),
    [messagesOnly],
  );
  const scrollLatest = (animated = true) =>
    requestAnimationFrame(() => list.current?.scrollToEnd({ animated }));
  const fail = (error: unknown) => Alert.alert("Não foi possível", communityErrorMessage(error));

  useEffect(() => {
    if (!messages.isSuccess || !rows.length || didInitialScroll.current) return;
    didInitialScroll.current = true;
    scrollLatest(false);
  }, [messages.isSuccess, rows.length]);
  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", () => {
      if (nearBottom.current) scrollLatest();
    });
    return () => subscription.remove();
  }, []);

  const send = (
    draft = body,
    requestId = createCommunityRequestId(),
    replyToId = reply?.id ?? null,
  ) => {
    const clean = draft.trim();
    if (!clean || clean.length > 1200 || !sending.current.acquire()) return;
    setSendInFlight(true);
    actions.send.mutate(
      { body: clean, requestId, replyToId },
      {
        onSuccess: () => {
          setFailed((current) => clearFailedAfterSend(current, requestId));
          setBody((current) => clearComposerAfterSend(current, clean));
          setReply((current) => clearReplyAfterSend(current, replyToId));
          if (nearBottom.current) scrollLatest();
        },
        onError: (error) => {
          setFailed({ body: clean, requestId, replyToId });
          fail(error);
        },
        onSettled: () => {
          sending.current.release();
          setSendInFlight(false);
        },
      },
    );
  };
  const membershipActive = channel ? hasActiveOfficialMembership(channel) : false;
  if (channels.isPending)
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.muted}>Abrindo a Community…</Text>
        </View>
      </SafeAreaView>
    );
  if (channels.isError || !channel || !membershipActive)
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>NEXORA Community</Text>
          <Text style={styles.muted}>
            {channels.isError
              ? "Não foi possível confirmar sua participação."
              : "Entre pela tela Community antes de abrir esta conversa."}
          </Text>
          {channels.isError ? (
            <Pressable onPress={() => channels.refetch()}>
              <Text style={styles.link}>Tentar novamente</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.back()}>
            <Text style={styles.link}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>NEXORA Community</Text>
          <Text style={[styles.live, messages.realtimeStatus !== "connected" && styles.offline]}>
            {messages.realtimeStatus === "connected"
              ? "Tempo real ativo"
              : messages.realtimeStatus === "connecting"
                ? "Reconectando…"
                : "Comunidade oficial"}
          </Text>
        </View>
        <Pressable
          onPress={() =>
            Alert.alert(
              "Regras da Community",
              "Respeito, sem spam ou assédio. Não compartilhe dados pessoais de terceiros.",
            )
          }
        >
          <Text style={styles.rules}>Regras</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.preferences}>
          {(["highlights", "all", "muted"] as NotificationMode[]).map((mode) => (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityLabel={`Notificações: ${mode === "highlights" ? "Destaques" : mode === "all" ? "Todas" : "Silenciado"}`}
              disabled={channelActions.notifications.isPending}
              onPress={() =>
                channelActions.notifications.mutate({ channel: channelId, mode }, { onError: fail })
              }
              style={[styles.pref, channel.notificationMode === mode && styles.prefOn]}
            >
              <Text style={styles.prefText}>
                {mode === "highlights" ? "Destaques" : mode === "all" ? "Todas" : "Silenciado"}
              </Text>
            </Pressable>
          ))}
        </View>
        {messages.isError ? (
          <View style={styles.center}>
            <Text style={styles.muted}>Não foi possível carregar a conversa.</Text>
            <Pressable onPress={() => messages.refetch()}>
              <Text style={styles.link}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            ref={list}
            data={rows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            onEndReached={() => messages.hasNextPage && messages.fetchNextPage()}
            onScroll={(event) => {
              const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
              const near = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
              nearBottom.current = near;
              if (near) setShowNew(false);
            }}
            onContentSizeChange={() => {
              if (nearBottom.current) scrollLatest();
              else setShowNew(true);
            }}
            renderItem={({ item }) =>
              item.kind === "date" ? (
                <View style={styles.date}>
                  <Text style={styles.dateText}>{formatMessageDate(item.createdAt)}</Text>
                </View>
              ) : (
                <MessageRow
                  message={item.message}
                  replied={item.message.replyToId ? byId.get(item.message.replyToId) : undefined}
                  onLongPress={() => setSelected(item.message)}
                />
              )
            }
          />
        )}
        {showNew ? (
          <Pressable
            accessibilityRole="button"
            style={styles.new}
            onPress={() => {
              nearBottom.current = true;
              setShowNew(false);
              scrollLatest();
            }}
          >
            <Text style={styles.newText}>Novas mensagens ↓</Text>
          </Pressable>
        ) : null}
        {failed ? (
          <Pressable
            style={styles.failure}
            onPress={() => send(failed.body, failed.requestId, failed.replyToId)}
          >
            <Text style={styles.failureText}>
              Falha ao enviar “{failed.body}”. Toque para tentar novamente.
            </Text>
          </Pressable>
        ) : null}
        {reply ? (
          <View style={styles.replyComposer}>
            <View style={styles.replyText}>
              <Text style={styles.sender}>Respondendo a {reply.displayName}</Text>
              <Text numberOfLines={1} style={styles.muted}>
                {truncate(reply.body)}
              </Text>
            </View>
            <Pressable accessibilityLabel="Cancelar resposta" onPress={() => setReply(null)}>
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Mensagem"
            multiline
            scrollEnabled
            blurOnSubmit={false}
            textAlignVertical="top"
            maxLength={1200}
            value={body}
            onChangeText={setBody}
            placeholder="Mensagem…"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primaryBright}
            cursorColor={colors.primaryBright}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem"
            disabled={!body.trim() || sendInFlight}
            onPress={() => send()}
            style={[styles.send, (!body.trim() || sendInFlight) && styles.disabled]}
          >
            <Text style={styles.sendText}>Enviar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <MessageMenu
        message={selected}
        close={() => setSelected(null)}
        reply={() => {
          if (selected) setReply(selected);
          setSelected(null);
        }}
        react={(reaction) => {
          if (selected && !reacting.current.has(selected.id)) {
            reacting.current.add(selected.id);
            actions.react.mutate(
              { id: selected.id, reaction: selected.myReaction === reaction ? null : reaction },
              {
                onError: fail,
                onSettled: () => reacting.current.delete(selected.id),
              },
            );
          }
          setSelected(null);
        }}
        report={() => {
          if (selected && !reporting.current.has(selected.id)) {
            reporting.current.add(selected.id);
            actions.report.mutate(selected.id, {
              onSuccess: () => Alert.alert("Recebido", "A denúncia foi registrada para análise."),
              onError: fail,
              onSettled: () => reporting.current.delete(selected.id),
            });
          }
          setSelected(null);
        }}
        block={() => {
          if (selected) actions.block.mutate(selected.id, { onError: fail });
          setSelected(null);
        }}
      />
    </SafeAreaView>
  );
}

function MessageRow({
  message,
  replied,
  onLongPress,
}: {
  message: CommunityMessage;
  replied?: CommunityMessage;
  onLongPress(): void;
}) {
  const host = message.actorType === "system";
  const summaries = (Object.keys(reactionLabels) as ChatReaction[]).filter(
    (reaction) => (message.reactions[reaction] ?? 0) > 0,
  );
  return (
    <View style={[styles.messageLine, message.isSelf && styles.mineLine]}>
      {!message.isSelf ? (
        message.avatarUrl ? (
          <Image source={{ uri: message.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, host && styles.hostAvatar]}>
            <Text style={styles.avatarText}>{host ? "N" : initials(message.displayName)}</Text>
          </View>
        )
      ) : null}
      <Pressable
        accessibilityLabel={`${message.displayName}: ${message.body}`}
        onLongPress={onLongPress}
        style={[styles.message, message.isSelf && styles.mine, host && styles.host]}
      >
        <View style={styles.identity}>
          <Text style={[styles.sender, host && styles.hostText]}>
            {host ? "NEXORA Host" : message.displayName}
          </Text>
          {host ? <Text style={styles.badge}>AUTOMÁTICO</Text> : null}
        </View>
        {message.replyToId ? (
          <View style={styles.quote}>
            <Text style={styles.quoteName}>
              {replied?.displayName ?? "Resposta a uma mensagem"}
            </Text>
            {replied ? (
              <Text numberOfLines={1} style={styles.muted}>
                {truncate(replied.body)}
              </Text>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.body}>{message.body}</Text>
        <Text style={styles.time}>
          {new Date(message.createdAt).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
        {summaries.length ? (
          <View style={styles.reactions}>
            {summaries.map((reaction) => (
              <Text key={reaction} style={styles.reaction}>
                {reactionLabels[reaction]} {message.reactions[reaction]}
              </Text>
            ))}
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

function MessageMenu({
  message,
  close,
  reply,
  react,
  report,
  block,
}: {
  message: CommunityMessage | null;
  close(): void;
  reply(): void;
  react(r: ChatReaction): void;
  report(): void;
  block(): void;
}) {
  if (!message) return null;
  const available = messageActions(message);
  return (
    <Modal transparent visible animationType="fade" onRequestClose={close}>
      <Pressable style={styles.scrim} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{message.displayName}</Text>
          <View style={styles.quick}>
            {(Object.keys(reactionLabels) as ChatReaction[]).map((reaction) => (
              <Pressable
                key={reaction}
                accessibilityRole="button"
                accessibilityLabel={`Reagir com ${reaction === "heart" ? "coração" : reaction === "fire" ? "fogo" : reaction === "clap" ? "aplausos" : "força"}`}
                onPress={() => react(reaction)}
                style={styles.quickButton}
              >
                <Text style={styles.quickEmoji}>{reactionLabels[reaction]}</Text>
              </Pressable>
            ))}
          </View>
          {available.canReply ? <MenuButton label="Responder" onPress={reply} /> : null}
          {available.canCopy ? (
            <MenuButton
              label="Copiar texto"
              onPress={async () => {
                // expo-clipboard is the SDK 54 contract; dependency installation is required
                // before enabling copy in a native build.
                const copied = await copyCommunityText(message.body, message.removed, undefined);
                Alert.alert(copied ? "Mensagem copiada." : "Não foi possível copiar a mensagem.");
                close();
              }}
            />
          ) : null}
          {available.canReport ? <MenuButton label="Denunciar" danger onPress={report} /> : null}
          {available.canBlock ? (
            <MenuButton label="Bloquear usuário" danger onPress={block} />
          ) : null}
          <MenuButton label="Cancelar" onPress={close} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const MenuButton = ({
  label,
  onPress,
  danger = false,
}: {
  label: string;
  onPress(): void;
  danger?: boolean;
}) => (
  <Pressable style={styles.menuButton} onPress={onPress}>
    <Text style={[styles.menuText, danger && styles.danger]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  headerText: { flex: 1 },
  back: { fontSize: 36, color: colors.text },
  title: { ...typography.heading, color: colors.text },
  live: { ...typography.caption, color: colors.success },
  offline: { color: colors.textMuted },
  rules: { ...typography.label, color: colors.primaryBright },
  preferences: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
    justifyContent: "center",
  },
  pref: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prefOn: { backgroundColor: colors.accentMuted, borderColor: colors.primary },
  prefText: { ...typography.caption, color: colors.text },
  list: { flexGrow: 1, padding: spacing.md, gap: spacing.sm },
  date: {
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  dateText: { ...typography.caption, color: colors.textMuted },
  messageLine: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
    maxWidth: "92%",
    alignSelf: "flex-start",
  },
  mineLine: { alignSelf: "flex-end" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
  },
  hostAvatar: { borderWidth: 1, borderColor: colors.primary },
  avatarText: { ...typography.label, color: colors.primaryBright },
  message: {
    maxWidth: "88%",
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
  },
  mine: { backgroundColor: colors.accentMuted },
  host: { borderWidth: 1, borderColor: colors.primary },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  sender: { ...typography.label, color: colors.textMuted },
  hostText: { color: colors.primaryBright },
  badge: { fontSize: 9, color: colors.primaryBright },
  body: { ...typography.body, color: colors.text },
  time: { ...typography.caption, color: colors.textMuted, textAlign: "right" },
  quote: {
    borderLeftWidth: 2,
    borderColor: colors.primary,
    paddingLeft: spacing.sm,
    marginVertical: spacing.xs,
  },
  quoteName: { ...typography.caption, color: colors.primaryBright },
  reactions: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs },
  reaction: {
    ...typography.caption,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  send: {
    minHeight: 46,
    minWidth: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  sendText: { ...typography.label, color: colors.background },
  disabled: { opacity: 0.45 },
  replyComposer: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderColor: colors.primary,
  },
  replyText: { flex: 1 },
  close: { fontSize: 28, color: colors.textMuted, paddingHorizontal: spacing.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  muted: { ...typography.body, color: colors.textMuted },
  link: { ...typography.label, color: colors.primaryBright, marginTop: spacing.sm },
  new: {
    position: "absolute",
    bottom: 78,
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    padding: spacing.sm,
    zIndex: 3,
  },
  newText: { ...typography.label, color: colors.background },
  failure: { padding: spacing.sm, backgroundColor: "#3A1D1D" },
  failureText: { ...typography.caption, color: colors.danger },
  scrim: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.65)" },
  sheet: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
  },
  handle: {
    width: 42,
    height: 4,
    alignSelf: "center",
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  sheetTitle: { ...typography.heading, color: colors.text },
  quick: { flexDirection: "row", justifyContent: "space-around", paddingVertical: spacing.sm },
  quickButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  quickEmoji: { fontSize: 28 },
  menuButton: {
    minHeight: 44,
    justifyContent: "center",
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  menuText: { ...typography.body, color: colors.text },
  danger: { color: colors.danger },
});
