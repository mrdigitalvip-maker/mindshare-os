import { useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppScreen } from "@/components/app-screen";
import { NexoraAgent } from "@/components/nexora-agent";
import { useConversations } from "@/hooks/use-chat";
import { isGenericConversationTitle } from "@/lib/assistant-conversations";
import { colors, radius, spacing, typography } from "@/lib/theme";

export default function AssistantHome() {
  const conversations = useConversations();
  const [draft, setDraft] = useState("");
  const begin = () => {
    const prompt = draft.trim();
    router.push({ pathname: "/(app)/(tabs)/assistant-chat", params: prompt ? { prompt } : {} });
    setDraft("");
  };
  return (
    <AppScreen padded={false}>
      <View style={styles.header}>
        <NexoraAgent state="idle" size={56} />
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>NEXORA</Text>
          <Text style={styles.subtitle}>Assistente</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Novo chat"
          onPress={begin}
          style={styles.newButton}
        >
          <Text style={styles.newText}>＋ Novo chat</Text>
        </Pressable>
      </View>
      <FlatList
        data={conversations.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Text style={styles.hero}>Como posso ajudar agora?</Text>
            <Text style={styles.invitation}>
              Ideias, planejamento e respostas com o contexto da sua NEXORA.
            </Text>
            <View style={styles.composer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Adicionar anexo"
                onPress={() =>
                  router.push({
                    pathname: "/(app)/(tabs)/assistant-chat",
                    params: { attachment: "open" },
                  })
                }
                style={styles.attach}
              >
                <Text style={styles.attachText}>＋</Text>
              </Pressable>
              <TextInput
                accessibilityLabel="Mensagem para a NEXORA"
                multiline
                maxLength={12000}
                placeholder="Pergunte à NEXORA…"
                placeholderTextColor={colors.textMuted}
                value={draft}
                onChangeText={setDraft}
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Enviar mensagem"
                accessibilityState={{ disabled: !draft.trim() }}
                disabled={!draft.trim()}
                onPress={begin}
                style={[styles.send, !draft.trim() && styles.disabled]}
              >
                <Text style={styles.sendText}>↑</Text>
              </Pressable>
            </View>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Conversas recentes</Text>
              {conversations.isFetching && (
                <ActivityIndicator size="small" color={colors.primaryBright} />
              )}
            </View>
            {conversations.isError && (
              <View accessibilityRole="alert" style={styles.error}>
                <Text style={styles.errorText}>Não foi possível carregar suas conversas.</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tentar carregar conversas novamente"
                  onPress={() => void conversations.refetch()}
                >
                  <Text style={styles.retry}>Tentar novamente</Text>
                </Pressable>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !conversations.isPending && !conversations.isError ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Seu próximo chat começa aqui</Text>
              <Text style={styles.emptyBody}>
                Envie uma mensagem acima. A conversa será salva depois do primeiro envio.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const title = isGenericConversationTitle(item.title)
            ? "Conversa com a NEXORA"
            : item.title!;
          const date = new Date(item.updatedAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          });
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Abrir conversa ${title}`}
              onPress={() =>
                router.push({
                  pathname: "/(app)/(tabs)/assistant-chat",
                  params: { conversationId: item.id },
                })
              }
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.rowTitle}>
                  {title}
                </Text>
                <Text style={styles.date}>Atividade em {date}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          );
        }}
      />
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  header: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  brand: { ...typography.eyebrow, color: colors.primaryBright, letterSpacing: 2 },
  subtitle: { ...typography.caption, color: colors.textMuted },
  newButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm },
  newText: { ...typography.label, color: colors.primaryBright },
  content: { flexGrow: 1, padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  hero: { ...typography.heading, color: colors.text, marginTop: spacing.lg },
  invitation: { ...typography.body, color: colors.textMuted, marginBottom: spacing.md },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  attach: { width: 44, height: 48, alignItems: "center", justifyContent: "center" },
  attachText: { color: colors.primaryBright, fontSize: 26 },
  input: {
    ...typography.body,
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    padding: spacing.sm,
    color: colors.text,
    textAlignVertical: "top",
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
  sendText: { color: colors.text, fontSize: 24 },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  sectionTitle: { ...typography.label, color: colors.text },
  row: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  rowTitle: { ...typography.label, color: colors.text },
  date: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  chevron: { color: colors.primaryBright, fontSize: 28 },
  pressed: { opacity: 0.72 },
  empty: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.xs },
  emptyTitle: { ...typography.label, color: colors.text },
  emptyBody: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  error: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  errorText: { ...typography.body, color: colors.textMuted },
  retry: { ...typography.label, color: colors.primaryBright, marginTop: spacing.sm },
});
