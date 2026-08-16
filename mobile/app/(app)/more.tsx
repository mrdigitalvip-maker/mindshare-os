import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/lib/theme";
export default function More() {
  return (
    <View style={styles.page}>
      <Text style={styles.title}>More</Text>
      <Link href="/studies" style={styles.link}>
        Studies
      </Link>
      <Link href="/settings" style={styles.link}>
        Settings
      </Link>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background },
  title: { ...typography.title, color: colors.text },
  link: {
    ...typography.heading,
    color: colors.text,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
