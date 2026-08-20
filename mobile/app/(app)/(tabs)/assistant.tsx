import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppScreen } from "@/components/app-screen";
import { NexoraAgent } from "@/components/nexora-agent";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { useRecentConversation, useSendChat } from "@/hooks/use-chat";
import { assistantErrorCopy, createAssistantRequestId } from "@/lib/chat-contract";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { ChatServiceError, type ChatMessage } from "@/services/chat-service";

const STARTERS = [
  "Organize minhas prioridades",
  "Me ajude com meus projetos",
  "O que tenho para hoje?",
] as const;

export default function Assistant() {
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();
  const list = useRef<FlatList<ChatMessage>>(null);
  const handledPrompt = useRef<string | undefined>(undefined);
  const history = useRecentConversation();
  const send = useSendChat();
  const [draft, setDraft] = useState("");
  const [newConversation, setNewConversation] = useState(false);
  const [failed, setFailed] = useState<{
    content: string;
    requestId: string;
    code?: string;
  } | null>(null);
  const [optimistic, setOptimistic] = useState<ChatMessage | null>(null);
  const messages = useMemo(() => {
    const persisted = newConversation ? [] : (history.data?.messages ?? []);
    return optimistic ? [...persisted, optimistic] : persisted;
  }, [history.data?.messages, newConversation, optimistic]);

  const submit = useCallback(
    async (value: string, retryId?: string) => {
      const content = value.trim();
      if (!content || send.isPending) return;
      const id = retryId ?? createAssistantRequestId();
      setFailed(null);
      setDraft("");
      setOptimistic({ id, role: "user", content, createdAt: null });
      requestAnimationFrame(() => list.current?.scrollToEnd({ animated: true }));
      try {
        await send.mutateAsync({
          message: content,
          conversationId: newConversation ? null : (history.data?.conversationId ?? null),
          requestId: id,
        });
        setNewConversation(false);
        setOptimistic(null);
      } catch (error) {
        const code = error instanceof ChatServiceError ? error.code : undefined;
        setOptimistic(null);
        setDraft(content);
        setFailed({ content, requestId: id, code });
      }
    },
    [history.data?.conversationId, newConversation, send],
  );

  useEffect(() => {
    if (!history.isSuccess || !prompt || handledPrompt.current === prompt) return;
    handledPrompt.current = prompt;
    void submit(prompt);
  }, [history.isSuccess, prompt, submit]);

  useEffect(() => {
    if (!messages.length) return;
    requestAnimationFrame(() => list.current?.scrollToEnd({ animated: true }));
  }, [messages.length]);

  if (history.isPending) return <LoadingState title="Carregando conversa…" />;
  if (history.isError)
    return (
      <ErrorState
        title="Não foi possível carregar agora."
        message="Seu histórico continua salvo. Verifique sua conexão."
        actionLabel="Tentar novamente"
        onAction={() => void history.refetch()}
      />
    );

  const errorCopy = failed ? assistantErrorCopy(failed.code) : null;
  return (
    <AppScreen keyboard padded={false}>
      <View style={styles.header}>
        <NexoraAgent
          state={send.isPending ? "thinking" : failed ? "attention" : "idle"}
          size={54}
        />
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>NEXORA</Text>
          <Text style={styles.status}>{send.isPending ? "Pensando…" : "Assistente pessoal"}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Iniciar nova conversa"
          onPress={() => {
            setNewConversation(true);
            setDraft("");
            setFailed(null);
          }}
          style={styles.newButton}
        >
          <Text style={styles.newButtonText}>Nova</Text>
        </Pressable>
      </View>

      <FlatList
        ref={list}
        style={styles.listViewport}
        data={messages}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={messages.length ? styles.list : styles.emptyList}
        onContentSizeChange={() => {
          if (send.isPending || messages.length <= 2) list.current?.scrollToEnd({ animated: true });
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <NexoraAgent state="quiet" size={78} />
            <Text style={styles.emptyTitle}>Como posso ajudar?</Text>
            <Text style={styles.emptyBody}>Pense, planeje e organize seu dia com a NEXORA.</Text>
            <View style={styles.starters}>
              {STARTERS.map((starter) => (
                <Pressable
                  key={starter}
                  accessibilityRole="button"
                  onPress={() => void submit(starter)}
                  style={styles.starter}
                >
                  <Text style={styles.starterText}>{starter}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.messageRow}>
            {item.role === "assistant" ? <Text style={styles.author}>NEXORA</Text> : null}
            <View style={[styles.message, item.role === "user" ? styles.user : styles.assistant]}>
              <Text selectable style={styles.messageText}>
                {item.content}
              </Text>
            </View>
          </View>
        )}
        ListFooterComponent={
          send.isPending ? <Text style={styles.thinking}>✦ NEXORA está pensando…</Text> : null
        }
      />

      {errorCopy ? (
        <View accessibilityRole="alert" style={styles.error}>
          <View style={styles.errorCopy}>
            <Text style={styles.errorTitle}>{errorCopy.title}</Text>
            <Text style={styles.errorDetail}>{errorCopy.detail}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => void submit(failed!.content, failed!.requestId)}
          >
            <Text style={styles.retry}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Mensagem para a NEXORA"
          multiline
          blurOnSubmit={false}
          maxLength={12000}
          placeholder="Mensagem para a NEXORA…"
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={(value) => {
            setDraft(value);
            if (failed && value !== failed.content) setFailed(null);
          }}
          style={styles.input}
          textAlignVertical="top"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
          accessibilityState={{ disabled: !draft.trim() || send.isPending }}
          disabled={!draft.trim() || send.isPending}
          onPress={() => void submit(draft)}
          style={[styles.send, (!draft.trim() || send.isPending) && styles.disabled]}
        >
          <Text style={styles.sendText}>↑</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerCopy: { flex: 1 },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  status: { ...typography.caption, color: colors.textMuted },
  newButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm },
  newButtonText: { ...typography.label, color: colors.primaryBright },
  listViewport: { flex: 1 },
  list: { flexGrow: 1, gap: spacing.md, padding: spacing.md, paddingBottom: spacing.lg },
  emptyList: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
  empty: { alignItems: "center", gap: spacing.sm },
  emptyTitle: { ...typography.heading, color: colors.text },
  emptyBody: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  starters: { width: "100%", gap: spacing.sm, marginTop: spacing.md },
  starter: {
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  starterText: { ...typography.label, color: colors.text },
  messageRow: { minWidth: 0 },
  author: {
    ...typography.caption,
    color: colors.primaryBright,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  message: {
    maxWidth: "86%",
    minWidth: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.lg,
  },
  user: {
    alignSelf: "flex-end",
    backgroundColor: colors.accentMuted,
    borderBottomRightRadius: radius.sm,
  },
  assistant: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceRaised,
    borderBottomLeftRadius: radius.sm,
  },
  messageText: { ...typography.body, color: colors.text },
  thinking: { ...typography.label, color: colors.textMuted, paddingVertical: spacing.md },
  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.danger,
  },
  errorCopy: { flex: 1, minWidth: 0 },
  errorTitle: { ...typography.label, color: colors.danger },
  errorDetail: { ...typography.caption, color: colors.textMuted },
  retry: { ...typography.label, color: colors.primaryBright, paddingVertical: spacing.sm },
  composer: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    ...typography.body,
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
  },
  send: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: colors.primary,
  },
  disabled: { opacity: 0.4 },
  sendText: { color: colors.text, fontSize: 24, lineHeight: 26 },
});
