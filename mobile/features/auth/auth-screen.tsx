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
      setMessage("Add the two EXPO_PUBLIC_SUPABASE values before signing in.");
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
      setMessage(result.error.message);
      return;
    }
    if (result.data.session) router.replace("/dashboard");
    else setMessage("Check your email to confirm your account.");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.page}
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>NEXORA · NATIVE</Text>
        <Text style={styles.title}>
          {mode === "login" ? "Welcome back" : "Create your account"}
        </Text>
        <Text style={styles.copy}>A secure, native session. No browser or embedded website.</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          autoCapitalize="none"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="Password"
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
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Sign up"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setMode(mode === "login" ? "signup" : "login")}
        >
          <Text style={styles.link}>
            {mode === "login" ? "Need an account? Sign up" : "Already registered? Sign in"}
          </Text>
        </Pressable>
        <Link href="/auth/recovery" style={styles.link}>
          Forgot password?
        </Link>
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
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eyebrow: { ...typography.label, color: colors.primaryBright },
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
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: "center",
  },
  primaryText: { ...typography.label, color: colors.text },
  link: {
    ...typography.label,
    color: colors.primaryBright,
    textAlign: "center",
    padding: spacing.sm,
  },
});
