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
import { Link, router } from "expo-router";

import { authCallbackUrl } from "@/lib/auth-links";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { colors, radius, spacing, typography } from "@/lib/theme";

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  async function submit() {
    if (!hasSupabaseConfig) {
      console.error("NEXORA auth configuration is unavailable.");
      setMessage("Não foi possível entrar agora. Tente novamente mais tarde.");
      return;
    }
    setBusy(true);
    setMessage(undefined);
    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: authCallbackUrl },
          });
    setBusy(false);
    if (result.error) {
      console.error("NEXORA authentication failed", result.error);
      setMessage("E-mail ou senha inválidos. Verifique os dados e tente novamente.");
      return;
    }
    if (result.data.session) router.replace("/dashboard");
    else setMessage("Confira seu e-mail para confirmar a conta.");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.page}
    >
      <View style={styles.card}>
        <Text style={styles.brand}>NEXORA</Text>
        <Text style={styles.title}>
          {mode === "login" ? "Boas-vindas de volta" : "Crie sua conta"}
        </Text>
        <Text style={styles.copy}>Entre para continuar no seu espaço.</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="E-mail"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          autoCapitalize="none"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="Senha"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
        {message ? (
          <Text accessibilityLiveRegion="polite" style={styles.message}>
            {message}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void submit()}
          style={styles.primary}
        >
          <Text style={styles.primaryText}>
            {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setMode(mode === "login" ? "signup" : "login")}
        >
          <Text style={styles.link}>
            {mode === "login" ? "Novo na NEXORA? Criar uma conta" : "Já tem uma conta? Entrar"}
          </Text>
        </Pressable>
        <Link href="/auth/recovery" style={styles.link}>
          Esqueceu a senha?
        </Link>
        <Text style={styles.terms}>Ao continuar, você concorda com os Termos e a Política de Privacidade.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  card: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  brand: { fontSize: 18, fontWeight: "700", letterSpacing: 5, color: colors.text, marginBottom: spacing.xl },
  title: { ...typography.title, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  message: { ...typography.label, color: colors.warning },
  primary: {
    padding: spacing.md,
    backgroundColor: colors.text,
    borderRadius: radius.md,
    alignItems: "center",
  },
  primaryText: { ...typography.label, color: colors.background },
  link: {
    ...typography.label,
    color: colors.primaryBright,
    textAlign: "center",
    padding: spacing.sm,
  },
  terms: { ...typography.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
});
