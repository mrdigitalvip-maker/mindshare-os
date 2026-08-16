import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/lib/theme";
export function FoundationScreen({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.page}>
      <View style={styles.glow} />
      <Text style={styles.kicker}>NEXORA</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.copy}>{description}</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Native foundation ready</Text>
        <Text style={styles.copy}>
          This route is isolated from the web client and ready for its backend vertical slice.
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  page: {
    flex: 1,
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#332A78",
    opacity: 0.28,
    right: -100,
    top: -80,
  },
  kicker: { ...typography.label, color: colors.primaryBright, letterSpacing: 3 },
  title: { ...typography.title, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted },
  card: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { ...typography.heading, color: colors.text },
});
