import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing, typography } from "@/lib/theme";
export function NativeFormModal({
  visible,
  title,
  value,
  placeholder,
  secondaryValue,
  secondaryPlaceholder,
  busy,
  error,
  onChange,
  onSecondaryChange,
  onSave,
  onClose,
}: {
  visible: boolean;
  title: string;
  value: string;
  placeholder: string;
  secondaryValue?: string;
  secondaryPlaceholder?: string;
  busy?: boolean;
  error?: string | null;
  onChange(value: string): void;
  onSecondaryChange?(value: string): void;
  onSave(): void;
  onClose(): void;
}) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            autoFocus
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            value={value}
            onChangeText={onChange}
            style={styles.input}
          />
          {secondaryValue !== undefined && onSecondaryChange ? (
            <TextInput
              multiline
              placeholder={secondaryPlaceholder}
              placeholderTextColor={colors.textMuted}
              value={secondaryValue}
              onChangeText={onSecondaryChange}
              style={[styles.input, styles.multiline]}
            />
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondary}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy || !value.trim()}
              onPress={onSave}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>{busy ? "Saving…" : "Save"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.65)" },
  sheet: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  title: { ...typography.heading, color: colors.text },
  input: {
    minHeight: 50,
    padding: spacing.md,
    borderRadius: radius.md,
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multiline: { minHeight: 110, textAlignVertical: "top" },
  error: { ...typography.label, color: colors.danger },
  actions: { flexDirection: "row", gap: spacing.sm },
  secondary: { flex: 1, minHeight: 48, justifyContent: "center" },
  secondaryText: { ...typography.label, textAlign: "center", color: colors.textMuted },
  primary: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryText: { ...typography.label, textAlign: "center", color: colors.text },
});
