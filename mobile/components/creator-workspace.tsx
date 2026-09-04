import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppScreen } from "@/components/app-screen";
import { colors, radius, spacing, typography } from "@/lib/theme";
export function CreatorPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <AppScreen scroll contentContainerStyle={s.page}>
      <Text style={s.title}>{title}</Text>
      {description ? <Text style={s.copy}>{description}</Text> : null}
      {children}
    </AppScreen>
  );
}
export function CreatorField({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: "numeric";
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[s.input, multiline && s.multiline]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );
}
export function CreatorButton({
  label,
  onPress,
  disabled,
  danger,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, disabled && s.disabled, danger && s.danger]}
    >
      <Text style={s.buttonText}>{label}</Text>
    </Pressable>
  );
}
export function ChoiceRow({
  values,
  selected,
  onSelect,
}: {
  values: { value: string; label: string }[];
  selected: string | string[];
  onSelect: (value: string) => void;
}) {
  return (
    <View style={s.choices}>
      {values.map(({ value, label }) => {
        const active = Array.isArray(selected) ? selected.includes(value) : selected === value;
        return (
          <Pressable
            key={value}
            onPress={() => onSelect(value)}
            style={[s.choice, active && s.active]}
          >
            <Text style={s.choiceText}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
export { s as creatorStyles };
const s = StyleSheet.create({
  page: { gap: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.title, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted },
  label: { ...typography.caption, color: colors.textMuted },
  field: { gap: spacing.xs },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    padding: spacing.sm,
  },
  buttonText: { ...typography.body, color: colors.text, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  danger: { backgroundColor: colors.danger },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  active: { borderColor: colors.primary, backgroundColor: colors.surfaceRaised },
  choiceText: { ...typography.caption, color: colors.text },
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  heading: { ...typography.heading, color: colors.text },
  error: { ...typography.body, color: colors.danger },
  success: { ...typography.body, color: colors.success },
});
