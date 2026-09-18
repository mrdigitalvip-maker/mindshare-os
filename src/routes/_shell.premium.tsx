import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Crown, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/page-shell";
import { useLanguage } from "@/providers/language-provider";
import { Button } from "@/components/ui/button";
import { subscriptionQueryKey, useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/lib/auth-context";
import { BillingService } from "@/services/billing-service";
import { LEGAL_URLS } from "@/lib/legal";

export const Route = createFileRoute("/_shell/premium")({
  head: () => ({ meta: [{ title: "Premium — KIVRYN" }] }),
  component: Premium,
});

const FREE_FEATURES = [
  ["Acesso ao Assistente principal", "Core Assistant access"],
  ["Projetos, tarefas e espaços pessoais", "Projects, tasks and personal workspaces"],
  ["Conteúdo padrão de aprendizagem", "Standard learning content"],
  ["Requisições de IA medidas pelo backend", "Backend-metered AI requests"],
] as const;
const PRO_FEATURES = [
  ["Uso de IA ampliado e controlado pelo backend", "Higher backend-enforced AI usage"],
  ["Agents de IA reutilizáveis", "Reusable AI Agents"],
  ["Fluxos avançados de IA", "Advanced AI workflows"],
  ["Lições Premium do Studio", "Premium Studio lessons"],
  ["Recursos mais profundos para conteúdo, estudos e documentos", "Deeper content, study and document capabilities"],
] as const;

function Premium() {
  const { t, resolvedLocale } = useLanguage();
  const L = (pt: string, en: string) => (resolvedLocale === "pt-BR" ? pt : en);
  const freeFeatures = FREE_FEATURES.map(([pt, en]) => L(pt, en));
  const proFeatures = PRO_FEATURES.map(([pt, en]) => L(pt, en));
  const [checkingOut, setCheckingOut] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: subscription, isLoading, isFetching, refetch } = useSubscription();
  const checkoutResult =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("checkout");

  useEffect(() => {
    if (checkoutResult === "success") {
      void queryClient.invalidateQueries({ queryKey: subscriptionQueryKey(user?.id) });
    }
  }, [checkoutResult, queryClient, user?.id]);

  async function startCheckout() {
    setCheckingOut(true);
    try {
      const checkoutUrl = await BillingService.createCheckoutUrl();
      if (!checkoutUrl) {
        toast.success(L("Modo demonstração: checkout simulado. O Stripe abre quando a cobrança estiver habilitada.", "Demo mode: checkout simulated. Stripe opens once billing is enabled."));
        return;
      }
      window.location.assign(checkoutUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : L("Não foi possível iniciar o checkout.", "Unable to start checkout.");
      toast.error(message);
    } finally {
      setCheckingOut(false);
    }
  }

  async function openPortal() {
    setOpeningPortal(true);
    try {
      const portalUrl = await BillingService.createPortalUrl();
      if (!portalUrl) toast.info(L("O portal de cobrança não está disponível no modo demonstração.", "The billing portal is unavailable in demo mode."));
      else window.location.assign(portalUrl);
    } catch {
      toast.error(L("Não foi possível abrir o gerenciamento de cobrança. Tente novamente.", "Unable to open billing management. Please try again."));
    } finally {
      setOpeningPortal(false);
    }
  }

  const endDate = subscription?.currentPeriodEnd
    ? new Intl.DateTimeFormat(resolvedLocale, { dateStyle: "medium" }).format(
        new Date(subscription.currentPeriodEnd),
      )
    : null;

  return (
    <PageShell>
      <PageHeader
        eyebrow={L("Planos", "Plans")}
        title={t("page.premium.title")}
        description={t("page.premium.description")}
      />
      <div className="mt-4 text-sm text-muted-foreground">
        {L("Status atual", "Current status")}:{" "}
        <span className="font-medium text-foreground">
          {isLoading ? L("Verificando…", "Checking…") : subscription?.isPremium ? "Premium" : "Free"}
        </span>
      </div>
      {checkoutResult === "success" && !subscription?.isPremium && (
        <div className="mt-4 rounded-xl border border-intelligence/30 bg-intelligence/5 p-4 text-sm">
          {L("Pagamento recebido. Sua assinatura ainda está sincronizando; o acesso só é liberado após a confirmação do Stripe.", "Payment received. Your subscription is still syncing; access is granted only after Stripe confirms it.")}
          <Button
            className="ml-3"
            size="sm"
            variant="outline"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {isFetching ? L("Verificando…", "Checking…") : L("Verificar novamente", "Check again")}
          </Button>
        </div>
      )}
      {checkoutResult === "cancelled" && (
        <p className="mt-4 text-sm text-muted-foreground">
          {L("O checkout foi cancelado. Nenhuma alteração de plano foi feita.", "Checkout was cancelled. No plan change was made.")}
        </p>
      )}
      {subscription?.status === "trialing" && (
        <p className="mt-3 text-sm text-intelligence">
          {L("Seu teste do Stripe está ativo", "Your Stripe trial is active")}{endDate ? ` ${L("até", "until")} ${endDate}` : ""}.
        </p>
      )}
      {subscription?.cancelAtPeriodEnd && subscription.isPremium && (
        <p className="mt-3 text-sm text-muted-foreground">
          {L("O cancelamento está agendado. O Premium permanece disponível", "Cancellation is scheduled. Premium remains available")}{" "}{endDate ? `${L("até", "through")} ${endDate}` : L("até o fim do período", "until the period ends")}.
        </p>
      )}
      {["past_due", "unpaid"].includes(subscription?.status ?? "") && (
        <p className="mt-3 text-sm text-destructive">
          {L("O pagamento falhou. Atualize sua forma de pagamento para restaurar o Premium.", "Payment failed. Update your payment method to restore Premium.")}
        </p>
      )}
      {subscription?.isPremium && (
        <Button
          className="mt-4 rounded-full"
          variant="outline"
          onClick={openPortal}
          disabled={openingPortal}
        >
          {openingPortal ? L("Abrindo…", "Opening…") : L("Gerenciar cobrança, pagamento ou cancelamento", "Manage billing, payment or cancellation")}
        </Button>
      )}
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card
          badge={!subscription?.isPremium ? L("Atual", "Current") : undefined}
          name="Free"
          price="$0"
          period={L("para sempre", "forever")}
          features={freeFeatures}
          cta={
            <Button variant="outline" className="rounded-full" disabled>
              {subscription?.isPremium ? L("Base incluída", "Included foundation") : L("Plano atual", "Current plan")}
            </Button>
          }
        />
        <Card
          highlight
          badge={L("Mais popular", "Most popular")}
          name="Premium"
          price="$12"
          period={L("por mês", "per month")}
          features={proFeatures}
          cta={
            <Button
              className="rounded-full"
              onClick={startCheckout}
              disabled={checkingOut || isLoading || subscription?.isPremium}
              title={L("Iniciar checkout do Stripe", "Start a Stripe checkout session")}
            >
              <Crown className="mr-1 h-4 w-4" />
              {checkingOut
                ? L("Iniciando checkout...", "Starting checkout...")
                : subscription?.isPremium
                  ? L("Premium ativo", "Premium active")
                  : L("Fazer upgrade para Premium", "Upgrade to Premium")}
            </Button>
          }
        />
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        {L("O checkout do Stripe usa a Edge Function pública e retorna para a rota Premium.", "Stripe checkout is wired through the public edge function and will redirect back to the Premium route.")}
      </p>
      <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 text-center text-xs text-muted-foreground">
        <span>{L("Ao fazer upgrade, você concorda com as políticas da KIVRYN:", "By upgrading, you agree to KIVRYN's policies:")}</span>
        <a
          href={LEGAL_URLS.termsOfService}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {L("Termos de Serviço", "Terms of Service")}
        </a>
        <a
          href={LEGAL_URLS.privacyPolicy}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {L("Política de Privacidade", "Privacy Policy")}
        </a>
      </p>
    </PageShell>
  );
}

function Card({
  name,
  price,
  period,
  features,
  cta,
  badge,
  highlight,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: React.ReactNode;
  badge?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative rounded-3xl border p-8 ${
        highlight
          ? "border-intelligence/40 bg-[radial-gradient(120%_80%_at_50%_-20%,oklch(0.79_0.14_210/0.12),transparent_60%)]"
          : "border-border bg-surface"
      }`}
    >
      {badge && (
        <span
          className={`absolute right-6 top-6 rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-widest ${
            highlight
              ? "bg-intelligence/15 text-intelligence"
              : "bg-surface-elevated text-muted-foreground"
          }`}
        >
          {badge}
        </span>
      )}
      <div className="flex items-center gap-2">
        {highlight ? (
          <Crown className="h-5 w-5 text-intelligence" />
        ) : (
          <Sparkles className="h-5 w-5" />
        )}
        <h3 className="font-display text-2xl">{name}</h3>
      </div>
      <p className="mt-6 flex items-baseline gap-2">
        <span className="font-display text-5xl">{price}</span>
        <span className="text-sm text-muted-foreground">{period}</span>
      </p>
      <ul className="mt-8 space-y-3 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <Check className="h-4 w-4 text-intelligence" /> {f}
          </li>
        ))}
      </ul>
      <div className="mt-8">{cta}</div>
    </div>
  );
}
