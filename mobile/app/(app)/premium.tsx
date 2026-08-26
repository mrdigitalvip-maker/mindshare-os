import { ScrollView, StyleSheet, Text, View } from "react-native";
import { NexoraAgent } from "@/components/nexora-agent";
import { useSubscription } from "@/hooks/use-subscription";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { subscriptionPlanLabel } from "@/lib/settings-state";
export default function Premium() {
  const subscription = useSubscription();
  const tier = subscriptionPlanLabel(subscription.data?.entitlement);
  return (
    <ScrollView contentContainerStyle={s.page}>
      <NexoraAgent size={92} state="attention" />
      <Text style={s.eyebrow}>SEU PLANO</Text>
      <Text style={s.title}>{tier}</Text>
      <Text style={s.copy}>Sua experiência NEXORA acompanha o estado atual da sua assinatura.</Text>
      <View style={s.card}>
        <Text style={s.heading}>Disponível agora</Text>
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
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  title: { ...typography.title, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  card: {
    alignSelf: "stretch",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  heading: { ...typography.heading, color: colors.text },
  item: { ...typography.body, color: colors.text },
  note: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
});
