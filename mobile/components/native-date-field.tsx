import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { localDateKey } from "@/lib/journeys";
import { colors, radius, spacing, typography } from "@/lib/theme";

type NativeDateFieldLocale = "pt-BR" | "en";

const calendarCopy = {
  "pt-BR": {
    months: [
      "janeiro",
      "fevereiro",
      "março",
      "abril",
      "maio",
      "junho",
      "julho",
      "agosto",
      "setembro",
      "outubro",
      "novembro",
      "dezembro",
    ],
    weekdays: ["D", "S", "T", "Q", "Q", "S", "S"],
    previousMonth: "Mês anterior",
    nextMonth: "Próximo mês",
    targetDate: "Data-alvo",
    clear: "Remover data",
    cancel: "Cancelar",
  },
  en: {
    months: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    weekdays: ["S", "M", "T", "W", "T", "F", "S"],
    previousMonth: "Previous month",
    nextMonth: "Next month",
    targetDate: "Target date",
    clear: "Clear date",
    cancel: "Cancel",
  },
} as const;

export function NativeDateField({
  value,
  onChange,
  minimumDate = new Date(),
  label = "Adicionar data-alvo (opcional)",
  locale = "pt-BR",
}: {
  value: string | null;
  onChange(value: string | null): void;
  minimumDate?: Date;
  label?: string;
  locale?: NativeDateFieldLocale;
}) {
  const text = calendarCopy[locale];
  const minimum = new Date(
    minimumDate.getFullYear(),
    minimumDate.getMonth(),
    minimumDate.getDate(),
  );
  const selected = value ? new Date(`${value}T12:00:00`) : minimum;
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));
  const days = useMemo(() => {
    const leading = month.getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [
      ...Array(leading).fill(null),
      ...Array.from({ length: count }, (_, index) => index + 1),
    ];
  }, [month]);
  const move = (offset: number) =>
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={s.field}
      >
        <Text style={value ? s.value : s.placeholder}>
          {value ? `${text.targetDate}: ${selected.toLocaleDateString(locale)}` : label}
        </Text>
      </Pressable>
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <View style={s.calendar}>
            <View style={s.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={text.previousMonth}
                onPress={() => move(-1)}
              >
                <Text style={s.arrow}>‹</Text>
              </Pressable>
              <Text style={s.heading}>
                {text.months[month.getMonth()]} {month.getFullYear()}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={text.nextMonth}
                onPress={() => move(1)}
              >
                <Text style={s.arrow}>›</Text>
              </Pressable>
            </View>
            <View style={s.grid}>
              {text.weekdays.map((day, index) => (
                <Text key={`${day}-${index}`} style={s.weekday}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={s.grid}>
              {days.map((day, index) => {
                if (!day) return <View key={`empty-${index}`} style={s.day} />;
                const date = new Date(month.getFullYear(), month.getMonth(), day);
                const iso = localDateKey(date);
                const disabled = date < minimum;
                return (
                  <Pressable
                    key={iso}
                    accessibilityRole="button"
                    accessibilityLabel={date.toLocaleDateString(locale)}
                    disabled={disabled}
                    onPress={() => {
                      onChange(iso);
                      setOpen(false);
                    }}
                    style={[s.day, iso === value && s.selected]}
                  >
                    <Text style={[s.dayText, disabled && s.disabled]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={s.actions}>
              {value ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <Text style={s.clear}>{text.clear}</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)}>
                <Text style={s.cancel}>{text.cancel}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  field: {
    minHeight: 50,
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  value: { ...typography.body, color: colors.text },
  placeholder: { ...typography.body, color: colors.textMuted },
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  calendar: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heading: { ...typography.heading, color: colors.text, textTransform: "capitalize" },
  arrow: { fontSize: 32, color: colors.primaryBright, paddingHorizontal: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: {
    width: "14.285%",
    textAlign: "center",
    ...typography.caption,
    color: colors.textMuted,
  },
  day: {
    width: "14.285%",
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  selected: { backgroundColor: colors.primary },
  dayText: { ...typography.body, color: colors.text },
  disabled: { color: colors.border },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 40,
    alignItems: "center",
  },
  clear: { ...typography.label, color: colors.danger },
  cancel: { ...typography.label, color: colors.primaryBright },
});
