import { ScrollView, StyleSheet, Text, View } from "react-native";
import { NexoraAgent } from "@/components/nexora-agent";
import { useSubscription } from "@/hooks/use-subscription";
import { colors, radius, spacing, typography } from "@/lib/theme";
export default function Premium() {
  const subscription = useSubscription();
  const tier = subscription.data?.entitlement ?? "Básico";
  return (
    <ScrollView contentContainerStyle={s.page}>
      <NexoraAgent size={112} state="attention" />
      <Text style={s.eyebrow}>SEU PLANO</Text>
      <Text style={s.title}>{tier}</Text>
      <Text style={s.copy}>Sua experiência NEXORA acompanha o estado atual da sua assinatura.</Text>
      <View style={s.card}>
        <Text style={s.heading}>Benefícios do NEXORA</Text>
        <Text style={s.item}>✦ Assistência conectada ao seu espaço</Text>
        <Text style={s.item}>✦ Projetos, tarefas e estudos integrados</Text>
        <Text style={s.item}>✦ Histórico e continuidade entre sessões</Text>
      </View>
      <Text style={s.note}>
        Compras no Android estarão disponíveis somente quando a cobrança nativa do Google Play
        estiver implementada.
      </Text>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  title: { ...typography.display, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  card: {
    alignSelf: "stretch",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  heading: { ...typography.heading, color: colors.text },
  item: { ...typography.body, color: colors.text },
  note: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
});
