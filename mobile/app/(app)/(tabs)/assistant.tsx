import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { AppScreen } from "@/components/app-screen";
import { KivrynCore } from "@/components/kivryn-core";
import { MenuButton } from "@/components/product-ui";
import { useConversations } from "@/hooks/use-chat";
import { isGenericConversationTitle } from "@/lib/assistant-conversations";
import { colors, radius, shadows, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";

const copy = {
  "pt-BR": {
    core: "KIVRYN CORE",
    status: "Sistema conectado",
    headline: "O que você quer que eu faça?",
    body: "Eu entendo seu espaço, proponho ações e opero o KIVRYN com sua confirmação.",
    placeholder: "Diga o que precisa acontecer…",
    attach: "Anexar",
    send: "Enviar",
    newChat: "Novo chat",
    quick: "COMECE POR AQUI",
    history: "CONVERSAS",
    empty: "Seu histórico começa com a próxima conversa.",
    loadError: "Não foi possível carregar suas conversas.",
    retry: "Tentar novamente",
    activity: "Atividade em",
    generic: "Conversa com a KIVRYN",
    capabilities: "CONTROLE DO SISTEMA",
    cap1: "Tarefas",
    cap2: "Projetos",
    cap3: "Estudos",
    cap4: "Arquivos",
    voice: "Voz",
  },
  en: {
    core: "KIVRYN CORE",
    status: "System connected",
    headline: "What do you want me to do?",
    body: "I understand your workspace, propose actions and operate KIVRYN with your confirmation.",
    placeholder: "Tell me what needs to happen…",
    attach: "Attach",
    send: "Send",
    newChat: "New chat",
    quick: "START HERE",
    history: "CONVERSATIONS",
    empty: "Your history starts with the next conversation.",
    loadError: "Your conversations could not be loaded.",
    retry: "Try again",
    activity: "Activity on",
    generic: "Conversation with KIVRYN",
    capabilities: "SYSTEM CONTROL",
    cap1: "Tasks",
    cap2: "Projects",
    cap3: "Studies",
    cap4: "Files",
    voice: "Voice",
  },
} as const;

const starters = {
  "pt-BR": [
    { label: "Organizar meu dia", prompt: "Analise meu espaço e organize meu dia. Diga qual deve ser meu próximo passo." },
    { label: "Criar um projeto", prompt: "Quero criar um novo projeto. Me ajude a definir objetivo e próximas ações." },
    { label: "Planejar estudos", prompt: "Analise meus estudos e me ajude a escolher a próxima ação mais importante." },
    { label: "Revisar tarefas", prompt: "Revise minhas tarefas abertas e encontre atrasos, bloqueios e prioridades." },
  ],
  en: [
    { label: "Plan my day", prompt: "Analyze my workspace and organize my day. Tell me what my next step should be." },
    { label: "Create a project", prompt: "I want to create a new project. Help me define the objective and next actions." },
    { label: "Plan my studies", prompt: "Analyze my studies and help me choose the most important next action." },
    { label: "Review tasks", prompt: "Review my open tasks and identify overdue items, blockers and priorities." },
  ],
} as const;

export default function AssistantHome() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const suggestions = starters[resolvedLocale];
  const conversations = useConversations();
  const [draft, setDraft] = useState("");

  const begin = (preset?: string) => {
    const prompt = (preset ?? draft).trim();
    router.push({ pathname: "/(app)/(tabs)/assistant-chat", params: prompt ? { prompt } : {} });
    setDraft("");
  };

  const dateLocale = resolvedLocale === "pt-BR" ? "pt-BR" : "en-US";
  const capabilityLabels = useMemo(
    () => [text.cap1, text.cap2, text.cap3, text.cap4],
    [text.cap1, text.cap2, text.cap3, text.cap4],
  );

  return (
    <AppScreen padded={false}>
      <FlatList
        data={conversations.data ?? []}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <View pointerEvents="none" style={styles.glowA} />
              <View pointerEvents="none" style={styles.glowB} />
              <View style={styles.heroTop}>
                <MenuButton />
                <View style={styles.identity}>
                  <KivrynCore size={64} state="idle" />
                  <View style={styles.identityCopy}>
                    <Text style={styles.coreLabel}>{text.core}</Text>
                    <View style={styles.statusRow}>
                      <View style={styles.liveDot} />
                      <Text style={styles.status}>{text.status}</Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={text.newChat}
                  onPress={() => begin()}
                  style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}
                >
                  <Text style={styles.newButtonText}>＋</Text>
                </Pressable>
              </View>

              <Text accessibilityRole="header" style={styles.headline}>{text.headline}</Text>
              <Text style={styles.body}>{text.body}</Text>

              <View style={styles.capabilityHeader}>
                <Text style={styles.microLabel}>{text.capabilities}</Text>
                <View style={styles.voiceBadge}>
                  <Text style={styles.voiceBadgeText}>◉ {text.voice}</Text>
                </View>
              </View>
              <View style={styles.capabilities}>
                {capabilityLabels.map((label) => (
                  <View key={label} style={styles.capabilityPill}>
                    <Text style={styles.capabilityText}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.composerShell}>
              <TextInput
                accessibilityLabel={text.placeholder}
                multiline
                maxLength={12000}
                placeholder={text.placeholder}
                placeholderTextColor={colors.textMuted}
                value={draft}
                onChangeText={setDraft}
                style={styles.input}
              />
              <View style={styles.composerFooter}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={text.attach}
                  onPress={() =>
                    router.push({ pathname: "/(app)/(tabs)/assistant-chat", params: { attachment: "open" } })
                  }
                  style={({ pressed }) => [styles.toolButton, pressed && styles.pressed]}
                >
                  <Text style={styles.toolIcon}>＋</Text>
                  <Text style={styles.toolLabel}>{text.attach}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={text.send}
                  accessibilityState={{ disabled: !draft.trim() }}
                  disabled={!draft.trim()}
                  onPress={() => begin()}
                  style={({ pressed }) => [
                    styles.send,
                    !draft.trim() && styles.disabled,
                    pressed && draft.trim() && styles.pressed,
                  ]}
                >
                  <Text style={styles.sendText}>↑</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{text.quick}</Text>
            </View>
            <View style={styles.starters}>
              {suggestions.map((item, index) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  onPress={() => begin(item.prompt)}
                  style={({ pressed }) => [styles.starter, pressed && styles.pressed]}
                >
                  <View style={styles.starterIcon}>
                    <Text style={styles.starterSymbol}>{index === 0 ? "✦" : index === 1 ? "◇" : index === 2 ? "◫" : "✓"}</Text>
                  </View>
                  <Text style={styles.starterText}>{item.label}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{text.history}</Text>
              {conversations.isFetching ? <ActivityIndicator size="small" color={colors.primaryBright} /> : null}
            </View>
            {conversations.isError ? (
              <View accessibilityRole="alert" style={styles.error}>
                <Text style={styles.errorText}>{text.loadError}</Text>
                <Pressable accessibilityRole="button" onPress={() => void conversations.refetch()}>
                  <Text style={styles.retry}>{text.retry}</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          !conversations.isPending && !conversations.isError ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{text.empty}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const title = isGenericConversationTitle(item.title) ? text.generic : item.title!;
          const date = new Date(item.updatedAt).toLocaleDateString(dateLocale, { day: "2-digit", month: "short" });
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={title}
              onPress={() =>
                router.push({ pathname: "/(app)/(tabs)/assistant-chat", params: { conversationId: item.id } })
              }
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.conversationMark}><Text style={styles.conversationSpark}>✦</Text></View>
              <View style={styles.flex}>
                <Text numberOfLines={1} style={styles.rowTitle}>{title}</Text>
                <Text style={styles.date}>{text.activity} {date}</Text>
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
  content: { flexGrow: 1, padding: spacing.md, paddingBottom: 112, gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.75 },
  hero: {
    position: "relative",
    overflow: "hidden",
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(82,229,255,0.15)",
    backgroundColor: "#07101A",
    ...shadows.raised,
  },
  glowA: {
    position: "absolute",
    width: 220,
    height: 220,
    right: -100,
    top: -110,
    borderRadius: 110,
    backgroundColor: "rgba(0,184,217,0.11)",
  },
  glowB: {
    position: "absolute",
    width: 170,
    height: 170,
    left: -100,
    bottom: -110,
    borderRadius: 85,
    backgroundColor: "rgba(139,124,246,0.08)",
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  identity: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  identityCopy: { flex: 1, minWidth: 0 },
  coreLabel: { ...typography.eyebrow, color: colors.text, letterSpacing: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  status: { ...typography.caption, color: colors.textMuted },
  newButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  newButtonText: { color: colors.primaryBright, fontSize: 23, lineHeight: 26 },
  headline: {
    color: colors.text,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: "700",
    letterSpacing: -1,
    marginTop: 28,
  },
  body: { ...typography.body, color: colors.textSecondary, marginTop: 8, maxWidth: 420 },
  capabilityHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22 },
  microLabel: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: 1.5 },
  voiceBadge: {
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(82,229,255,0.14)",
    backgroundColor: "rgba(82,229,255,0.05)",
  },
  voiceBadgeText: { ...typography.caption, color: colors.primaryBright, fontSize: 10, fontWeight: "800" },
  capabilities: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  capabilityPill: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  capabilityText: { ...typography.caption, color: colors.textSecondary, fontSize: 10 },
  composerShell: {
    marginTop: 14,
    overflow: "hidden",
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "rgba(82,229,255,0.18)",
    backgroundColor: colors.surface,
  },
  input: {
    ...typography.body,
    minHeight: 96,
    maxHeight: 180,
    paddingHorizontal: 17,
    paddingTop: 16,
    color: colors.text,
    textAlignVertical: "top",
  },
  composerFooter: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, paddingBottom: 9 },
  toolButton: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 9 },
  toolIcon: { color: colors.primaryBright, fontSize: 20 },
  toolLabel: { ...typography.caption, color: colors.textMuted },
  send: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: colors.primaryBright },
  sendText: { color: "#001116", fontSize: 24, lineHeight: 27, fontWeight: "800" },
  disabled: { opacity: 0.28 },
  sectionHeader: { minHeight: 34, marginTop: 23, flexDirection: "row", alignItems: "center", gap: 10 },
  sectionTitle: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: 1.7 },
  starters: { gap: 8 },
  starter: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  starterIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.surfaceRaised },
  starterSymbol: { color: colors.primaryBright, fontSize: 15, fontWeight: "800" },
  starterText: { ...typography.label, color: colors.text, flex: 1 },
  chevron: { color: colors.textMuted, fontSize: 24 },
  row: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 13,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  conversationMark: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(82,229,255,0.06)" },
  conversationSpark: { color: colors.primaryBright, fontSize: 14 },
  rowTitle: { ...typography.label, color: colors.text },
  date: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  empty: { alignItems: "center", paddingVertical: 28 },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  error: { gap: 7, padding: 15, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  errorText: { ...typography.body, color: colors.textMuted },
  retry: { ...typography.label, color: colors.primaryBright },
});
