import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { NexoraAgent } from "@/components/nexora-agent";
import { useSubscription } from "@/hooks/use-subscription";
import { queryKeys } from "@/lib/query-keys";
import { isPremiumEntitlement } from "@/lib/subscription";
import { colors, radius, spacing, typography } from "@/lib/theme";
import {
  loadPlayProduct,
  purchasePremium,
  restorePremium,
  PLAY_BILLING_CONFIG,
  type PlayProduct,
} from "@/services/play-billing-service";

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
  const subscription = useSubscription(),
    queryClient = useQueryClient();
  const [product, setProduct] = useState<PlayProduct | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState<string | null>(null);
  const premium = isPremiumEntitlement(subscription.data?.entitlement ?? "free");
  useEffect(() => {
    if (Platform.OS === "android")
      loadPlayProduct()
        .then(setProduct)
        .catch((error) =>
          setMessage(
            error instanceof Error && error.message === "PLAY_PRODUCT_NOT_CONFIGURED"
              ? "A assinatura será exibida quando o produto do Google Play estiver configurado."
              : "Não foi possível consultar o Google Play agora.",
          ),
        );
  }, []);
  async function subscribe() {
    if (!product) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await purchasePremium(product);
      if (result.pending) {
        setMessage("Compra pendente. O acesso será liberado após a confirmação do Google Play.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.subscription });
      await subscription.refetch();
      Alert.alert(
        "NEXORA Premium ativado",
        "Seu espaço agora está com os recursos Premium liberados.",
      );
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (/cancel/i.test(code)) {
        setMessage("Compra cancelada. Nenhuma alteração foi feita.");
      } else setMessage("Não foi possível concluir a compra. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    setBusy(true);
    try {
      await restorePremium();
      await queryClient.invalidateQueries({ queryKey: queryKeys.subscription });
      await subscription.refetch();
      setMessage("Assinatura atualizada com o Google Play.");
    } catch {
      setMessage("Nenhuma compra válida foi encontrada para esta conta.");
    } finally {
      setBusy(false);
    }
  }
  function manage() {
    const url =
      subscription.data?.provider === "google_play"
        ? `https://play.google.com/store/account/subscriptions?sku=${encodeURIComponent(PLAY_BILLING_CONFIG.productId)}&package=${PLAY_BILLING_CONFIG.packageName}`
        : process.env.EXPO_PUBLIC_WEB_BILLING_URL;
    if (url) void Linking.openURL(url);
    else setMessage("Abra a NEXORA na Web para gerenciar esta assinatura Stripe.");
  }
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
      {premium && (
        <View style={[s.card, s.highlight]}>
          <Text style={s.cardTitle}>PREMIUM · Plano atual</Text>
          <Text style={s.price}>{product?.localizedPrice ?? "US$ 12/mês"}</Text>
          <Text style={s.item}>
            Status: {subscription.data?.status === "trialing" ? "Em teste" : "Ativo"}
          </Text>
          <Text style={s.item}>
            Provedor:{" "}
            {subscription.data?.provider === "google_play"
              ? "Google Play"
              : subscription.data?.provider === "stripe"
                ? "Stripe"
                : "NEXORA"}
          </Text>
          {subscription.data?.currentPeriodEnd && (
            <Text style={s.item}>
              {subscription.data.cancelAtPeriodEnd ? "Acesso até" : "Renovação"}:{" "}
              {new Date(subscription.data.currentPeriodEnd).toLocaleDateString("pt-BR")}
            </Text>
          )}
          <Button label="GERENCIAR ASSINATURA" action={manage} />
        </View>
      )}
      <View style={s.card}>
        <Text style={s.cardTitle}>GRATUITO {!premium && "· Plano atual"}</Text>
        <Text style={s.price}>US$ 0</Text>
        {FREE.map((x) => (
          <Text key={x} style={s.item}>
            ✓ {x}
          </Text>
        ))}
      </View>
      <View style={[s.card, s.highlight]}>
        <Text style={s.cardTitle}>PREMIUM</Text>
        <Text style={s.price}>{product?.localizedPrice ?? "US$ 12/mês"}</Text>
        {PREMIUM.map((x) => (
          <Text key={x} style={s.item}>
            ✓ {x}
          </Text>
        ))}
        {!premium && (
          <Button
            label={busy ? "PROCESSANDO…" : "ASSINAR PREMIUM"}
            action={subscribe}
            disabled={busy || !product}
          />
        )}
      </View>
      {Platform.OS === "android" && !premium && (
        <Pressable disabled={busy} onPress={restore}>
          <Text style={s.link}>Restaurar compra</Text>
        </Pressable>
      )}
      {message && <Text style={s.note}>{message}</Text>}
      <Text style={s.note}>
        As cotas diárias renovam à meia-noite UTC. Compras só liberam acesso após verificação do
        servidor.
      </Text>
    </ScrollView>
  );
}
function Button({
  label,
  action,
  disabled,
}: {
  label: string;
  action: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={action}
      style={[s.button, disabled && s.disabled]}
    >
      <Text style={s.buttonText}>{label}</Text>
    </Pressable>
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
  price: { ...typography.title, color: colors.primaryBright },
  item: { ...typography.body, color: colors.text },
  button: {
    marginTop: spacing.sm,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  disabled: { opacity: 0.45 },
  buttonText: { ...typography.heading, color: colors.background },
  link: {
    ...typography.body,
    color: colors.primaryBright,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  note: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
  error: { ...typography.body, color: colors.danger, textAlign: "center" },
});
