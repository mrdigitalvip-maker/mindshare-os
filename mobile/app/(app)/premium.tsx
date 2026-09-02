import { ScrollView, StyleSheet, Text, View } from "react-native";
import { NexoraAgent } from "@/components/nexora-agent";
import { useSubscription } from "@/hooks/use-subscription";
import { isPremiumEntitlement } from "@/lib/subscription";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { getAndroidPurchaseAvailability } from "@/lib/purchase-capabilities";

const FREE = [
  "Assistant básico — 10 mensagens/dia",
  "2 análises de imagem/arquivo por dia",
  "Até 3 projetos ativos e 30 tarefas abertas",
  "Até 3 matérias de estudo",
  "Sincronização da conta",
];
const PREMIUM = [
  "NEXORA Assistant avançado — 100 mensagens/dia",
  "20 análises de imagens/arquivos por dia",
  "Project Intelligence",
  "Execução inteligente em Tarefas",
  "NEXORA Tutor / Estudos avançados",
  "Limites ampliados para o Core NEXORA",
];
export default function Premium() {
  const subscription = useSubscription();
  const premium = isPremiumEntitlement(subscription.data?.entitlement ?? "free");
  const purchaseAvailability = getAndroidPurchaseAvailability();
  return (
    <ScrollView contentContainerStyle={s.page}>
      <NexoraAgent size={76} state="attention" />
      <Text style={s.eyebrow}>NEXORA PREMIUM</Text>
      <Text style={s.title}>
        Seu plano: {subscription.isError ? "Indisponível" : premium ? "Premium" : "Gratuito"}
      </Text>
      {subscription.isError && (
        <Text style={s.error}>
          Não foi possível verificar seu plano. Seu último acesso não foi alterado.
        </Text>
      )}
      {!subscription.isError && !subscription.isPending && subscription.data && (
        <View style={[s.card, s.highlight]}>
          <Text style={s.cardTitle}>DADOS DO PLANO</Text>
          {subscription.data.plan && <Text style={s.item}>Plano: {subscription.data.plan}</Text>}
          {subscription.data.status && (
            <Text style={s.item}>Status: {subscription.data.status}</Text>
          )}
          {subscription.data.provider && (
            <Text style={s.item}>
              Provedor:{" "}
              {subscription.data.provider === "google_play"
                ? "Google Play"
                : subscription.data?.provider === "stripe"
                  ? "Stripe"
                  : "NEXORA"}
            </Text>
          )}
          {subscription.data?.currentPeriodEnd && (
            <Text style={s.item}>
              {subscription.data.cancelAtPeriodEnd ? "Acesso até" : "Renovação"}:{" "}
              {new Date(subscription.data.currentPeriodEnd).toLocaleDateString("pt-BR")}
            </Text>
          )}
          {subscription.data.cancelAtPeriodEnd === true && !subscription.data.currentPeriodEnd && (
            <Text style={s.item}>Cancelamento ao fim do período: Sim</Text>
          )}
        </View>
      )}
      <View style={s.card}>
        <Text style={s.cardTitle}>GRATUITO {!premium && "· Plano atual"}</Text>
        <Text style={s.item}>Acesso gratuito, sem cobrança.</Text>
        {FREE.map((x) => (
          <Text key={x} style={s.item}>
            ✓ {x}
          </Text>
        ))}
      </View>
      <View style={[s.card, s.highlight]}>
        <Text style={s.cardTitle}>PREMIUM</Text>
        {PREMIUM.map((x) => (
          <Text key={x} style={s.item}>
            ✓ {x}
          </Text>
        ))}
        {!premium && purchaseAvailability === "unavailable_for_tester_build" && (
          <Text style={s.availability}>Assinaturas Premium estarão disponíveis em breve.</Text>
        )}
      </View>
      <Text style={s.note}>
        As cotas diárias renovam à meia-noite UTC. Seu plano é definido com segurança pela sua conta
        NEXORA.
      </Text>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: 48,
    backgroundColor: colors.background,
  },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright, textAlign: "center" },
  title: { ...typography.title, color: colors.text, textAlign: "center" },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  highlight: { borderColor: colors.primary },
  cardTitle: { ...typography.heading, color: colors.text },
  item: { ...typography.body, color: colors.text },
  availability: { ...typography.body, color: colors.primaryBright, textAlign: "center" },
  note: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
  error: { ...typography.body, color: colors.danger, textAlign: "center" },
});
