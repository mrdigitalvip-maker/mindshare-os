import { LocalizedCopy } from "@/components/localized-copy";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NexoraAgent } from "@/components/nexora-agent";
import { PremiumSurface, V2SectionHeader, V2SectionState } from "@/components/v2/premium-ui";
import {
  useClaimPremiumActivityReward,
  useSubscription,
} from "@/hooks/use-subscription";
import { isPremiumEntitlement } from "@/lib/subscription";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { getAndroidPurchaseAvailability } from "@/lib/purchase-capabilities";
import { useLanguage } from "@/providers/language-provider";

// Billing contracts: Assinaturas Premium estarão disponíveis em breve.
// Failure contract: Não foi possível verificar seu plano.
const FREE = [
  "Assistant básico — 10 mensagens/dia",
  "2 análises de imagem/arquivo por dia",
  "Até 3 projetos ativos e 30 tarefas abertas",
  "Até 3 matérias de estudo",
  "Sincronização da conta",
];

const PREMIUM = [
  "KIVRYN Assistant avançado — 100 mensagens/dia",
  "20 análises de imagens/arquivos por dia",
  "Project Intelligence",
  "Execução inteligente em Tarefas",
  "KIVRYN Tutor / Estudos avançados",
  "Limites ampliados para o Core KIVRYN",
];

export default function Premium() {
  const { resolvedLocale } = useLanguage();
  const L = (pt: string, en: string) => (resolvedLocale === "pt-BR" ? pt : en);
  const subscription = useSubscription();
  const claimReward = useClaimPremiumActivityReward();
  const premium = isPremiumEntitlement(subscription.data?.entitlement ?? "free");
  const purchaseAvailability = getAndroidPurchaseAvailability();
  const reward = subscription.data?.activityReward;
  const rewardProgressDays = reward?.eligible ? 90 : Math.min(90, reward?.currentStreak ?? 0);
  return (
    <ScrollView contentContainerStyle={s.page}>
      <NexoraAgent size={76} state="attention" />
      <V2SectionHeader title="KIVRYN PREMIUM" />
      <Text style={s.eyebrow}>
        <LocalizedCopy copyKey="legacy.07b331094b6f" />
      </Text>
      <Text style={s.title}>
        Seu plano: {subscription.isError ? "Indisponível" : premium ? "Premium" : "Gratuito"}
      </Text>
      <V2SectionState
        loading={subscription.isPending}
        error={subscription.isError}
        retry={() => void subscription.refetch()}
      />
      {!subscription.isError && !subscription.isPending && subscription.data && (
        <PremiumSurface illuminated style={s.card}>
          <Text style={s.cardTitle}>
            <LocalizedCopy copyKey="legacy.2de92a66404b" />
          </Text>
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
                  : "KIVRYN"}
            </Text>
          )}
          {subscription.data?.currentPeriodEnd && (
            <Text style={s.item}>
              {subscription.data.cancelAtPeriodEnd ? "Acesso até" : "Renovação"}:{" "}
              {new Date(subscription.data.currentPeriodEnd).toLocaleDateString("pt-BR")}
            </Text>
          )}
          {subscription.data.cancelAtPeriodEnd === true && !subscription.data.currentPeriodEnd && (
            <Text style={s.item}>
              <LocalizedCopy copyKey="legacy.889935710dd7" />
            </Text>
          )}
        </PremiumSurface>
      )}
      {!subscription.isError && !subscription.isPending && reward && (
        <PremiumSurface illuminated style={s.card}>
          <Text style={s.rewardEyebrow}>
            {L("RECOMPENSA DE CONSISTÊNCIA", "CONSISTENCY REWARD")}
          </Text>
          <Text style={s.cardTitle}>
            {L(
              "90 dias de atividade válida → 30 dias Premium",
              "90 valid activity days → 30 days Premium",
            )}
          </Text>
          <Text style={s.item}>
            {L(
              "Só conta atividade registrada pelo servidor, no máximo uma vez por dia.",
              "Only server-recorded activity counts, at most once per day.",
            )}
          </Text>
          <View style={s.rewardRow}>
            <Text style={s.rewardValue}>{rewardProgressDays}/90</Text>
            <Text style={s.rewardStatus}>
              {reward.active
                ? L("Premium de recompensa ativo", "Reward Premium active")
                : reward.claimed
                  ? L("Recompensa já utilizada", "Reward already used")
                  : reward.eligible
                    ? reward.canClaim
                      ? L("Recompensa conquistada", "Reward earned")
                      : L("Conquistada · disponível quando estiver no Free", "Earned · available when on Free")
                    : L(
                        `Faltam ${reward.daysRemaining} dias consecutivos`,
                        `${reward.daysRemaining} consecutive days remaining`,
                      )}
            </Text>
          </View>
          <View style={s.rewardTrack}>
            <View
              style={[
                s.rewardFill,
                { width: `${Math.min(100, (rewardProgressDays / 90) * 100)}%` },
              ]}
            />
          </View>
          {reward.active && reward.expiresAt ? (
            <Text style={s.item}>
              {L("Acesso gratuito até", "Free access until")}{" "}
              {new Date(reward.expiresAt).toLocaleDateString(
                resolvedLocale === "pt-BR" ? "pt-BR" : "en-US",
              )}
              . {L("Sem renovação automática.", "No automatic renewal.")}
            </Text>
          ) : null}
          {reward.canClaim ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: claimReward.isPending, busy: claimReward.isPending }}
              disabled={claimReward.isPending}
              onPress={() => claimReward.mutate()}
              style={({ pressed }) => [
                s.rewardButton,
                claimReward.isPending && s.disabled,
                pressed && s.pressed,
              ]}
            >
              <Text style={s.rewardButtonText}>
                {claimReward.isPending
                  ? L("Ativando…", "Activating…")
                  : L("Resgatar 30 dias Premium", "Claim 30 days Premium")}
              </Text>
            </Pressable>
          ) : null}
          {claimReward.isError ? (
            <Text style={s.error}>
              {L(
                "A elegibilidade não pôde ser confirmada. Tente novamente.",
                "Eligibility could not be confirmed. Try again.",
              )}
            </Text>
          ) : null}
          <Text style={s.note}>
            {L(
              "Depois dos 30 dias, o plano volta ao Free automaticamente se não houver assinatura paga.",
              "After 30 days, the plan returns to Free automatically unless a paid subscription exists.",
            )}
          </Text>
        </PremiumSurface>
      )}
      <PremiumSurface style={s.card}>
        <Text style={s.cardTitle}>GRATUITO {!premium && "· Plano atual"}</Text>
        <Text style={s.item}>
          <LocalizedCopy copyKey="legacy.06654ed8ea9e" />
        </Text>
        {FREE.map((x) => (
          <Text key={x} style={s.item}>
            ✓ {x}
          </Text>
        ))}
      </PremiumSurface>
      <PremiumSurface illuminated style={s.card}>
        <Text style={s.cardTitle}>
          <LocalizedCopy copyKey="legacy.1db0c4bef0db" />
        </Text>
        {PREMIUM.map((x) => (
          <Text key={x} style={s.item}>
            ✓ {x}
          </Text>
        ))}
        {!premium && purchaseAvailability === "unavailable_for_tester_build" && (
          <Text style={s.availability}>
            <LocalizedCopy copyKey="legacy.3119000e25c3" />
          </Text>
        )}
      </PremiumSurface>
      <Text style={s.note}>
        <LocalizedCopy copyKey="legacy.02185852e7fc" />
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
  rewardEyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  rewardValue: { ...typography.title, color: colors.primaryBright },
  rewardStatus: { ...typography.caption, color: colors.textMuted, flex: 1, textAlign: "right" },
  rewardTrack: {
    height: 8,
    overflow: "hidden",
    borderRadius: 99,
    backgroundColor: colors.surfaceRaised,
  },
  rewardFill: { height: "100%", borderRadius: 99, backgroundColor: colors.primaryBright },
  rewardButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  rewardButtonText: { ...typography.label, color: colors.background },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.82 },
  cardTitle: { ...typography.heading, color: colors.text },
  item: { ...typography.body, color: colors.text },
  availability: { ...typography.body, color: colors.primaryBright, textAlign: "center" },
  note: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
  error: { ...typography.body, color: colors.danger, textAlign: "center" },
});
