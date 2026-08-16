import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { passwordRecoveryUrl } from "@/lib/auth-links";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing, typography } from "@/lib/theme";
export default function Recovery() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string>();
  async function send() {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: passwordRecoveryUrl,
    });
    setMessage(error?.message ?? "Check your email for the recovery link.");
  }
  return (
    <View style={styles.page}>
      <Text style={styles.title}>Recover access</Text>
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
      <Pressable onPress={() => void send()} style={styles.button}>
        <Text style={styles.buttonText}>Send recovery link</Text>
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
