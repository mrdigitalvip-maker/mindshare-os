import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/lib/theme";

type Props = { title: string; message?: string; actionLabel?: string; onAction?: () => void };

export function LoadingState({ title = "Carregando" }: Pick<Props, "title">) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.text}>{title}</Text>
    </View>
  );
}
export function EmptyState(props: Props) {
  return <State {...props} />;
}
export function ErrorState(props: Props & { diagnosticId?: string }) {
  return <State {...props} />;
}
function State({ title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.text}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    backgroundColor: colors.background,
  },
  title: { ...typography.heading, fontSize: 20, color: colors.text, textAlign: "center" },
  text: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonText: { ...typography.label, color: colors.text },
});
