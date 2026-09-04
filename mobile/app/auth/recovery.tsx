import { LocalizedCopy } from "@/components/localized-copy";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { passwordRecoveryUrl } from "@/lib/auth-links";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing, typography } from "@/lib/theme";
export default function Recovery() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submitLock = useRef(false);
  async function send() {
    if (!email.trim() || submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: passwordRecoveryUrl,
      });
      setMessage(
        error
          ? "Não foi possível solicitar a recuperação agora. Verifique sua conexão e tente novamente."
          : "Se houver uma conta para este e-mail, você receberá as instruções de recuperação.",
      );
    } catch {
      setMessage(
        "Não foi possível solicitar a recuperação agora. Verifique sua conexão e tente novamente.",
      );
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={styles.page}>
      <Text style={styles.title}>
        <LocalizedCopy copyKey="legacy.c84aaa145b3e" />
      </Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable disabled={!email.trim() || busy} onPress={() => void send()} style={styles.button}>
        <Text style={styles.buttonText}>{busy ? "Enviando…" : "Enviar link de recuperação"}</Text>
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
  message: { ...typography.body, color: colors.textMuted },
  button: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  buttonText: { ...typography.label, color: colors.text, textAlign: "center" },
});
