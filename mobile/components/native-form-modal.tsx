import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { NativeDateField } from "@/components/native-date-field";
export function NativeFormModal({
  visible,
  title,
  value,
  placeholder,
  secondaryValue,
  secondaryPlaceholder,
  dateValue,
  datePlaceholder,
  busy,
  error,
  onChange,
  onSecondaryChange,
  onDateChange,
  onSave,
  onClose,
  children,
  errorMessage,
  destructiveAction,
  valueMaxLength,
  secondaryMaxLength,
}: {
  visible: boolean;
  title: string;
  value: string;
  placeholder: string;
  secondaryValue?: string;
  secondaryPlaceholder?: string;
  dateValue?: string;
  datePlaceholder?: string;
  busy?: boolean;
  error?: string | null;
  onChange(value: string): void;
  onSecondaryChange?(value: string): void;
  onDateChange?(value: string): void;
  onSave(): void;
  onClose(): void;
  children?: ReactNode;
  errorMessage?: string;
  destructiveAction?: { label: string; onPress(): void; busy?: boolean };
  valueMaxLength?: number;
  secondaryMaxLength?: number;
}) {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            autoFocus
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            value={value}
            maxLength={valueMaxLength}
            onChangeText={onChange}
            style={styles.input}
          />
          {secondaryValue !== undefined && onSecondaryChange ? (
            <TextInput
              multiline
              placeholder={secondaryPlaceholder}
              placeholderTextColor={colors.textMuted}
              value={secondaryValue}
              maxLength={secondaryMaxLength}
              onChangeText={onSecondaryChange}
              style={[styles.input, styles.multiline]}
            />
          ) : null}
          {dateValue !== undefined && onDateChange ? (
            <NativeDateField
              value={dateValue || null}
              onChange={(next) => onDateChange(next ?? "")}
              label={datePlaceholder}
            />
          ) : null}
          {children}
          {error ? <Text style={styles.error}>{errorMessage ?? error}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onClose}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy || !value.trim()}
              onPress={onSave}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>{busy ? "Salvando…" : "Salvar"}</Text>
            </Pressable>
          </View>
          {destructiveAction ? (
            <Pressable
              accessibilityRole="button"
              disabled={destructiveAction.busy}
              onPress={destructiveAction.onPress}
              style={styles.destructive}
            >
              <Text style={styles.error}>{destructiveAction.label}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
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
    maxHeight: "92%",
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
  destructive: { minHeight: 44, alignItems: "center", justifyContent: "center" },
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
