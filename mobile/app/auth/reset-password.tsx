import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useAuth } from "@/providers/auth-provider";
import { ensureAuthenticatedProfile } from "@/services/profile-service";
export default function ResetPassword() {
  const { session } = useAuth();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function update() {
    if (password.length < 8 || busy || !session) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setMessage("Não foi possível atualizar a senha. Tente novamente.");
    else {
      const profile = await ensureAuthenticatedProfile(session.user);
      router.replace(profile.onboarded ? "/dashboard" : "/onboarding");
    }
  }
  return (
    <View style={styles.page}>
      <Text style={styles.title}>Crie uma nova senha</Text>
      <TextInput
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="Nova senha (mínimo de 8 caracteres)"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable
        disabled={password.length < 8 || busy}
        onPress={() => void update()}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{busy ? "Atualizando…" : "Atualizar senha"}</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: { ...typography.title, color: colors.text },
  input: {
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  message: { color: colors.danger },
  button: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  buttonText: { ...typography.label, color: colors.text, textAlign: "center" },
});
