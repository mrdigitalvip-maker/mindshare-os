import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/lib/theme";

type Props = { title: string; message?: string; actionLabel?: string; onAction?: () => void };

export function LoadingState({ title = "Loading" }: Pick<Props, "title">) {
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
  return (
    <State
      {...props}
      message={[props.message, props.diagnosticId && `Diagnostic: ${props.diagnosticId}`]
        .filter(Boolean)
        .join("\n")}
    />
  );
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
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: { ...typography.heading, color: colors.text, textAlign: "center" },
  text: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  buttonText: { ...typography.label, color: colors.text },
});
