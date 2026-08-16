import { router, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NexoraAgent } from "@/components/nexora-agent";
import { useProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { resolveCapabilityTier } from "@/lib/capabilities";
import { colors, radius, spacing, typography } from "@/lib/theme";
const actions = [
  { label: "Talk to NEXORA", route: "/assistant" },
  { label: "Open projects", route: "/projects" },
  { label: "Review tasks", route: "/productivity" },
  { label: "Continue studying", route: "/studies" },
  { label: "Plan my week", route: "/assistant?prompt=Help%20me%20plan%20my%20week" },
] as const satisfies ReadonlyArray<{ label: string; route: Href }>;
export default function Dashboard() {
  const profile = useProfile();
  const subscription = useSubscription();
  const name = profile.data?.fullName?.trim().split(" ")[0] || "there";
  const tier = subscription.isError
    ? "NEXORA BASIC"
    : resolveCapabilityTier(subscription.data?.plan, subscription.data?.status);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.hero}>
        <NexoraAgent state="idle" />
        <Text style={styles.kicker}>{tier}</Text>
        <Text style={styles.title}>Hello, {name}</Text>
        <Text style={styles.copy}>Your native command center is ready.</Text>
      </View>
      <Text style={styles.section}>Continue</Text>
      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            key={action.route}
            onPress={() => router.push(action.route)}
            style={styles.card}
          >
            <Text style={styles.cardText}>{action.label}</Text>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
        ))}
      </View>
      {subscription.isError ? (
        <Text style={styles.secondaryError}>
          Premium status is temporarily unavailable. Core features remain ready.
        </Text>
      ) : null}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { gap: spacing.lg, padding: spacing.lg, backgroundColor: colors.background },
  hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  kicker: { ...typography.label, color: colors.primaryBright, letterSpacing: 2 },
  title: { ...typography.title, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted },
  section: { ...typography.heading, color: colors.text },
  grid: { gap: spacing.sm },
  card: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardText: { ...typography.body, color: colors.text },
  arrow: { fontSize: 22, color: colors.primaryBright },
  secondaryError: { ...typography.label, color: colors.warning },
});
