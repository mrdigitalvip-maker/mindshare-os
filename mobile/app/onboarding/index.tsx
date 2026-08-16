import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
export default function Onboarding() {
  const { session } = useAuth();
  async function complete() {
    if (!session) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: session.user.id, onboarded: true });
    if (!error) router.replace("/dashboard");
  }
  return (
    <View style={styles.page}>
      <Text style={styles.title}>Meet NEXORA</Text>
      <Text style={styles.copy}>One focused agent for planning, projects, tasks, and studies.</Text>
      <Pressable accessibilityRole="button" onPress={() => void complete()} style={styles.button}>
        <Text style={styles.buttonText}>Enter NEXORA</Text>
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
  copy: { ...typography.body, color: colors.textMuted },
  button: {
    minHeight: 48,
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  buttonText: { ...typography.label, textAlign: "center", color: colors.text },
});
