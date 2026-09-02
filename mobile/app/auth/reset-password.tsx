import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useAuth } from "@/providers/auth-provider";
import { ensureAuthenticatedProfile } from "@/services/profile-service";
export default function ResetPassword() {
  const { session, recoverySession, clearRecoverySession } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submitLock = useRef(false);
  async function update() {
    if (
      password.length < 8 ||
      password !== confirmation ||
      !session ||
      !recoverySession ||
      submitLock.current
    )
      return;
    submitLock.current = true;
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      clearRecoverySession();
      const profile = await ensureAuthenticatedProfile(session.user);
      router.replace(profile.onboarded ? "/dashboard" : "/onboarding");
    } catch {
      setMessage("O link pode ter expirado. Solicite uma nova recuperação e tente novamente.");
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }
  if (!session || !recoverySession)
    return (
      <View style={styles.page}>
        <Text style={styles.title}>Link de recuperação inválido ou expirado</Text>
        <Pressable onPress={() => router.replace("/auth/recovery")} style={styles.button}>
          <Text style={styles.buttonText}>Solicitar novo link</Text>
        </Pressable>
      </View>
    );
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
      <TextInput
        secureTextEntry
        value={confirmation}
        onChangeText={setConfirmation}
        placeholder="Confirme a nova senha"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      {confirmation && password !== confirmation ? (
        <Text style={styles.message}>As senhas não coincidem.</Text>
      ) : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable
        disabled={password.length < 8 || password !== confirmation || busy}
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
