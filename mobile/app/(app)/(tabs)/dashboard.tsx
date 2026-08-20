import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppScreen } from "@/components/app-screen";
import { AppHeader, DrawerMenu } from "@/components/product-ui";
import { NexoraAgent } from "@/components/nexora-agent";
import { useProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { resolveCapabilityTier } from "@/lib/capabilities";
import { colors, radius, spacing, typography } from "@/lib/theme";
export default function Dashboard() {
  const [drawer, setDrawer] = useState(false);
  const [draft, setDraft] = useState("");
  const profile = useProfile();
  const subscription = useSubscription();
  const name = profile.data?.fullName?.trim().split(" ")[0] || "você";
  const tier = subscription.isError
    ? "NEXORA BASIC"
    : resolveCapabilityTier(subscription.data?.plan, subscription.data?.status);
  function send() {
    const prompt = draft.trim();
    if (!prompt) return;
    setDraft("");
    router.push({ pathname: "/assistant", params: { prompt } });
  }
  return (
    <AppScreen padded={false}>
      <AppHeader onMenu={() => setDrawer(true)} />
      <DrawerMenu visible={drawer} onClose={() => setDrawer(false)} />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.identity}>
          <NexoraAgent size={62} state="idle" />
          <View style={styles.identityCopy}>
            <Text style={styles.eyebrow}>{tier} · ONLINE</Text>
            <Text style={styles.greeting}>Olá, {name}.</Text>
          </View>
        </View>
        <View style={styles.hero}>
          <Text style={styles.spark}>✦</Text>
          <Text style={styles.title}>O que vamos mover hoje?</Text>
          <Text style={styles.copy}>
            Posso pensar, planejar, criar e ajudar você a encontrar funções no NEXORA.
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push("/assistant?prompt=Ajude%20a%20planejar%20minha%20semana")}
            style={styles.chip}
          >
            <Text style={styles.chipText}>Planejar a semana</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/projects")} style={styles.chip}>
            <Text style={styles.chipText}>Abrir projetos</Text>
          </Pressable>
        </View>
        <View style={styles.composer}>
          <TextInput
            multiline
            value={draft}
            onChangeText={setDraft}
            placeholder="Converse com a NEXORA…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Pressable disabled={!draft.trim()} onPress={send} style={styles.send}>
            <Text style={styles.sendText}>↑</Text>
          </Pressable>
        </View>
      </ScrollView>
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  identityCopy: { flex: 1, minWidth: 0 },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  greeting: { ...typography.body, color: colors.text },
  hero: { gap: spacing.sm, paddingVertical: spacing.md, maxWidth: 560 },
  spark: { fontSize: 24, color: colors.primaryBright },
  title: { ...typography.display, fontSize: 34, lineHeight: 40, color: colors.text, flexShrink: 1 },
  copy: { ...typography.body, color: colors.textMuted, maxWidth: 520 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: { ...typography.label, color: colors.text },
  composer: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    ...typography.body,
    flex: 1,
    maxHeight: 100,
    color: colors.text,
    textAlignVertical: "top",
  },
  send: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: colors.primaryBright,
  },
  sendText: { fontSize: 24, color: colors.background },
});
