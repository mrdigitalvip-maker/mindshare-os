import { useMemo, useRef, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppScreen } from "@/components/app-screen";
import {
  useCommunityMessages,
  useMessageActions,
  useOfficialChannelActions,
  useOfficialChannels,
} from "@/hooks/use-community";
import {
  communityErrorMessage,
  type ChatReaction,
  type CommunityMessage,
  type NotificationMode,
} from "@/lib/community";
import { colors, radius, spacing, typography } from "@/lib/theme";

const reactionLabels: Record<ChatReaction, string> = {
  clap: "👏",
  fire: "🔥",
  strong: "💪",
  heart: "❤️",
};
export default function CommunityConversation() {
  const { channelId, name } = useLocalSearchParams<{ channelId: string; name?: string }>();
  const messages = useCommunityMessages(channelId),
    actions = useMessageActions(channelId),
    channelActions = useOfficialChannelActions(),
    channels = useOfficialChannels();
  const [body, setBody] = useState(""),
    [failed, setFailed] = useState<{ body: string; requestId: string } | null>(null),
    [showNew, setShowNew] = useState(false);
  const atBottom = useRef(true);
  const channel = channels.data?.find((x) => x.id === channelId);
  const rows = useMemo(
    () => messages.data?.pages.flat().sort((a, b) => a.createdAt.localeCompare(b.createdAt)) ?? [],
    [messages.data],
  );
  const fail = (e: unknown) => Alert.alert("Não foi possível", communityErrorMessage(e));
  const send = (
    draft = body,
    requestId = `${Date.now().toString(16).padStart(12, "0").slice(-12)}-${Math.random().toString(16).slice(2, 6).padEnd(4, "0")}-4${Math.random().toString(16).slice(2, 5).padEnd(3, "0")}-a${Math.random().toString(16).slice(2, 5).padEnd(3, "0")}-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`,
  ) => {
    const clean = draft.trim();
    if (!clean || actions.send.isPending) return;
    setBody("");
    setFailed(null);
    actions.send.mutate(
      { body: clean, requestId },
      {
        onError: (e) => {
          setFailed({ body: clean, requestId });
          fail(e);
        },
      },
    );
  };
  const menu = (m: CommunityMessage) =>
    Alert.alert(
      m.displayName,
      m.actorType === "system"
        ? "Mensagem oficial automatizada — não é uma pessoa."
        : "Ações de segurança",
      [
        {
          text: "Denunciar mensagem",
          onPress: () =>
            actions.report.mutate(m.id, {
              onSuccess: () => Alert.alert("Recebido", "A denúncia foi registrada para análise."),
              onError: fail,
            }),
        },
        ...(!m.isSelf && m.senderPublicId
          ? [
              {
                text: "Bloquear usuário",
                style: "destructive" as const,
                onPress: () => actions.block.mutate(m.id, { onError: fail }),
              },
            ]
          : []),
        { text: "Cancelar", style: "cancel" },
      ],
    );
  return (
    <AppScreen keyboard includeBottomInset padded={false}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{name ?? channel?.name ?? "Community"}</Text>
          <Text style={styles.live}>Conversa sincronizada com o servidor</Text>
        </View>
        <Pressable
          onPress={() =>
            Alert.alert(
              "Regras da Community",
              "Respeito. Sem spam, assédio ou conteúdo ilegal. Não compartilhe dados pessoais de terceiros. Este espaço existe para ajudar pessoas a executar objetivos reais.",
            )
          }
        >
          <Text style={styles.rules}>Regras</Text>
        </Pressable>
      </View>
      <View style={styles.preferences}>
        {(["highlights", "all", "muted"] as NotificationMode[]).map((mode) => (
          <Pressable
            key={mode}
            onPress={() =>
              channelActions.notifications.mutate({ channel: channelId, mode }, { onError: fail })
            }
            style={[styles.pref, channel?.notificationMode === mode && styles.prefOn]}
          >
            <Text style={styles.prefText}>
              {mode === "highlights" ? "Destaques" : mode === "all" ? "Todas" : "Silenciado"}
            </Text>
          </Pressable>
        ))}
      </View>
      {messages.isError ? (
        <View style={styles.center}>
          <Text style={styles.muted}>
            Não foi possível carregar. Seu histórico continua no servidor.
          </Text>
          <Pressable onPress={() => messages.refetch()}>
            <Text style={styles.link}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onEndReached={() => messages.hasNextPage && messages.fetchNextPage()}
          onScroll={(e) => {
            const near =
              e.nativeEvent.contentOffset.y + e.nativeEvent.layoutMeasurement.height >=
              e.nativeEvent.contentSize.height - 80;
            atBottom.current = near;
            if (near) setShowNew(false);
          }}
          onContentSizeChange={() => {
            if (!atBottom.current) setShowNew(true);
          }}
          renderItem={({ item }) => (
            <Pressable
              accessibilityLabel={`${item.displayName}: ${item.body}`}
              onLongPress={() => menu(item)}
              style={[
                styles.message,
                item.isSelf && styles.mine,
                item.actorType === "system" && styles.host,
              ]}
            >
              <Text style={[styles.sender, item.actorType === "system" && styles.hostText]}>
                {item.displayName}
                {item.actorType === "system" ? " · sistema automatizado" : ""}
              </Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>
                {new Date(item.createdAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {!item.removed && (
                <View style={styles.reactions}>
                  {(Object.keys(reactionLabels) as ChatReaction[]).map((r) => (
                    <Pressable
                      accessibilityLabel={`Reagir ${reactionLabels[r]}`}
                      key={r}
                      onPress={() =>
                        actions.react.mutate(
                          { id: item.id, reaction: item.myReaction === r ? null : r },
                          { onError: fail },
                        )
                      }
                    >
                      <Text style={styles.reaction}>
                        {reactionLabels[r]} {item.reactions[r] ?? 0}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Pressable>
          )}
        />
      )}
      {showNew && (
        <View style={styles.new}>
          <Text style={styles.newText}>Novas mensagens ↓</Text>
        </View>
      )}
      {failed && (
        <Pressable style={styles.failure} onPress={() => send(failed.body, failed.requestId)}>
          <Text style={styles.failureText}>
            Falha ao enviar “{failed.body}”. Toque para tentar novamente.
          </Text>
        </Pressable>
      )}
      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Mensagem"
          multiline
          maxLength={1200}
          value={body}
          onChangeText={setBody}
          placeholder="Compartilhe um avanço ou bloqueio…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
          disabled={!body.trim() || actions.send.isPending}
          onPress={() => send()}
          style={styles.send}
        >
          <Text style={styles.sendText}>Enviar</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  back: { fontSize: 36, color: colors.text },
  title: { ...typography.heading, color: colors.text },
  live: { ...typography.caption, color: colors.success },
  rules: { ...typography.label, color: colors.primaryBright },
  preferences: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
    justifyContent: "center",
  },
  pref: {
    padding: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prefOn: { backgroundColor: colors.accentMuted, borderColor: colors.primary },
  prefText: { ...typography.caption, color: colors.text },
  list: { padding: spacing.md, gap: spacing.sm },
  message: {
    alignSelf: "flex-start",
    maxWidth: "88%",
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
  },
  mine: { alignSelf: "flex-end", backgroundColor: colors.accentMuted },
  host: { borderWidth: 1, borderColor: colors.primary },
  sender: { ...typography.label, color: colors.textMuted },
  hostText: { color: colors.primaryBright },
  body: { ...typography.body, color: colors.text },
  time: { ...typography.caption, color: colors.textMuted, textAlign: "right" },
  reactions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  reaction: { ...typography.caption, color: colors.text },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 48,
    padding: spacing.sm,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  send: {
    minHeight: 48,
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  sendText: { ...typography.label, color: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  muted: { ...typography.body, color: colors.textMuted },
  link: { ...typography.label, color: colors.primaryBright, marginTop: spacing.sm },
  new: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    padding: spacing.sm,
  },
  newText: { ...typography.label, color: colors.background },
  failure: { padding: spacing.sm, backgroundColor: "#3A1D1D" },
  failureText: { ...typography.caption, color: colors.danger },
});
