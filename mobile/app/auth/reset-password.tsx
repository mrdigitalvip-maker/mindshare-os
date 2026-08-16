import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing, typography } from "@/lib/theme";
export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string>();
  async function update() {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else router.replace("/dashboard");
  }
  return (
    <View style={styles.page}>
      <Text style={styles.title}>Choose a new password</Text>
      <TextInput
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="New password"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable onPress={() => void update()} style={styles.button}>
        <Text style={styles.buttonText}>Update password</Text>
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
