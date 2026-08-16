import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRecentConversation, useSendChat } from "@/hooks/use-chat";
import { NexoraAgent } from "@/components/nexora-agent";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { colors, radius, spacing, typography } from "@/lib/theme";
import type { ChatMessage } from "@/services/chat-service";
function requestId() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
export default function Assistant() {
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();
  const handledPrompt = useRef<string | undefined>(undefined);
  const history = useRecentConversation();
  const send = useSendChat();
  const [draft, setDraft] = useState("");
  const [failedDraft, setFailedDraft] = useState<{ content: string; requestId: string } | null>(
    null,
  );
  const [agentState, setAgentState] = useState<"idle" | "thinking" | "success">("idle");
  const [optimistic, setOptimistic] = useState<ChatMessage | null>(null);
  const messages = useMemo(
    () =>
      optimistic ? [...(history.data?.messages ?? []), optimistic] : (history.data?.messages ?? []),
    [history.data?.messages, optimistic],
  );
  async function submit(value = draft, retryRequestId?: string) {
    const content = value.trim();
    if (!content || send.isPending) return;
    setFailedDraft(null);
    setDraft("");
    const safeRequestId = retryRequestId ?? requestId();
    setOptimistic({ id: safeRequestId, role: "user", content, createdAt: null });
    setAgentState("thinking");
    try {
      await send.mutateAsync({
        message: content,
        conversationId: history.data?.conversationId ?? null,
        requestId: safeRequestId,
      });
      setOptimistic(null);
      setAgentState("success");
      setTimeout(() => setAgentState("idle"), 1200);
    } catch {
      setOptimistic(null);
      setDraft(content);
      setFailedDraft({ content, requestId: safeRequestId });
      setAgentState("idle");
    }
  }
  useEffect(() => {
    if (!history.isSuccess || !prompt || handledPrompt.current === prompt) return;
    handledPrompt.current = prompt;
    void submit(prompt);
    // `handledPrompt` makes this navigation command idempotent; including `submit` would rerun each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.isSuccess, prompt]);
  if (history.isPending) return <LoadingState title="Loading conversation…" />;
  if (history.isError)
    return (
      <ErrorState
        title="Conversation unavailable"
        message="Your history is still stored. Check your connection."
        actionLabel="Retry"
        onAction={() => void history.refetch()}
      />
    );
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={88}
      style={styles.page}
    >
      <View style={styles.agent}>
        <NexoraAgent state={agentState} size={86} />
        <View>
          <Text style={styles.heading}>NEXORA</Text>
          <Text style={styles.status}>{agentState === "thinking" ? "Thinking…" : "Ready"}</Text>
        </View>
      </View>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={messages.length ? styles.list : styles.emptyList}
        ListEmptyComponent={
          <EmptyState
            title="Start a conversation"
            message="Ask NEXORA to plan, organize, or think with you."
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.message, item.role === "user" ? styles.user : styles.assistant]}>
            <Text style={styles.messageText}>{item.content}</Text>
          </View>
        )}
      />
      {send.isError ? (
        <View style={styles.localError}>
          <Text style={styles.errorText}>
            {send.error?.message ?? "Message failed. Your draft was preserved."}
          </Text>
          {failedDraft ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void submit(failedDraft.content, failedDraft.requestId)}
            >
              <Text style={styles.retry}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Message NEXORA"
          multiline
          placeholder="Message NEXORA…"
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={!draft.trim() || send.isPending}
          onPress={() => void submit()}
          style={[styles.send, (!draft.trim() || send.isPending) && styles.disabled]}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  agent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heading: { ...typography.heading, color: colors.text },
  status: { ...typography.label, color: colors.textMuted },
  list: { gap: spacing.sm, padding: spacing.md },
  emptyList: { flexGrow: 1 },
  message: { maxWidth: "86%", padding: spacing.md, borderRadius: radius.lg },
  user: { alignSelf: "flex-end", backgroundColor: colors.primary },
  assistant: { alignSelf: "flex-start", backgroundColor: colors.surface },
  messageText: { ...typography.body, color: colors.text },
  localError: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  errorText: { ...typography.label, color: colors.danger },
  retry: { ...typography.label, color: colors.primaryBright },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 48,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
  },
  send: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  disabled: { opacity: 0.45 },
  sendText: { ...typography.label, color: colors.text },
});
