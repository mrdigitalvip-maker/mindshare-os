import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect, router } from "expo-router";
import { NexoraAgent } from "@/components/nexora-agent";
import { AppScreen } from "@/components/app-screen";
import { LoadingState } from "@/components/screen-state";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
export default function Onboarding() {
  const { session, status } = useAuth();
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  if (status === "initializing") return <LoadingState title="Preparando seu espaço…" />;
  if (status === "unauthenticated") return <Redirect href="/auth" />;
  async function complete() {
    if (!session || !name.trim() || busy) return;
    setBusy(true);
    setErrorMessage(undefined);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: session.user.id, full_name: name.trim(), onboarded: true });
    setBusy(false);
    if (error) {
      setErrorMessage("Não foi possível concluir agora. Seu nome foi mantido; tente novamente.");
      return;
    }
    await client.invalidateQueries({ queryKey: queryKeys.profile });
    router.replace("/dashboard");
  }
  return (
    <AppScreen keyboard includeBottomInset contentContainerStyle={s.page}>
      <NexoraAgent size={160} state={name ? "attention" : "quiet"} />
      <Text style={s.eyebrow}>BOAS-VINDAS À NEXORA</Text>
      <Text style={s.title}>Como podemos chamar você?</Text>
      <Text style={s.progress}>Organize tarefas, projetos e estudos em um só lugar.</Text>
      <View style={s.composer}>
        <TextInput
          autoFocus
          value={name}
          onChangeText={setName}
          placeholder="Seu nome"
          placeholderTextColor={colors.textMuted}
          style={s.input}
        />
        <Pressable disabled={!name.trim() || busy} onPress={() => void complete()} style={s.send}>
          <Text style={s.sendText}>{busy ? "Salvando…" : "Começar"}</Text>
        </Pressable>
      </View>
      {errorMessage ? <Text style={s.error}>{errorMessage}</Text> : null}
    </AppScreen>
  );
}
const s = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
  },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  title: { ...typography.display, fontSize: 36, color: colors.text },
  progress: { ...typography.label, color: colors.textMuted },
  composer: {
    flexDirection: "row",
    alignItems: "center",
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
    minHeight: 48,
    color: colors.text,
    textAlignVertical: "top",
  },
  send: {
    minWidth: 96,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: colors.primaryBright,
  },
  sendText: { ...typography.label, color: colors.background },
  error: { ...typography.body, color: colors.danger },
});
