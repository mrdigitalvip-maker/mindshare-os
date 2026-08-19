import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { NexoraAgent } from "@/components/nexora-agent";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
export default function Onboarding() {
  const { session } = useAuth();
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  async function complete() {
    if (!session || !answer.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: session.user.id, onboarded: true });
    setBusy(false);
    if (!error) router.replace("/dashboard");
  }
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.page}>
      <NexoraAgent size={160} state={answer ? "attention" : "quiet"} />
      <Text style={s.eyebrow}>NEXORA · PRIMEIRO CONTATO</Text>
      <Text style={s.title}>O que você gostaria de transformar primeiro?</Text>
      <Text style={s.progress}>1 de 5 · responda do seu jeito</Text>
      <View style={s.composer}>
        <TextInput
          autoFocus
          multiline
          value={answer}
          onChangeText={setAnswer}
          placeholder="Conte para a NEXORA…"
          placeholderTextColor={colors.textMuted}
          style={s.input}
        />
        <Pressable disabled={!answer.trim() || busy} onPress={() => void complete()} style={s.send}>
          <Text style={s.sendText}>{busy ? "…" : "↑"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  title: { ...typography.display, fontSize: 36, color: colors.text },
  progress: { ...typography.label, color: colors.textMuted },
  composer: {
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
    minHeight: 70,
    color: colors.text,
    textAlignVertical: "top",
  },
  send: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: colors.primaryBright,
  },
  sendText: { fontSize: 23, color: colors.background },
});
