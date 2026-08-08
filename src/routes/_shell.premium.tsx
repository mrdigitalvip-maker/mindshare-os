import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Crown, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { subscriptionQueryKey, useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/lib/auth-context";
import { SubscriptionService } from "@/services";

export const Route = createFileRoute("/_shell/premium")({
  head: () => ({ meta: [{ title: "Premium — NEXORA" }] }),
  component: Premium,
});

const FREE = [
  "Core Assistant access",
  "Projects, tasks and personal workspaces",
  "Standard learning content",
  "Backend-metered AI requests",
];
const PRO = [
  "Higher backend-enforced AI usage",
  "Reusable AI Agents",
  "Advanced AI workflows",
  "Premium Studio lessons",
  "Deeper content, study and document capabilities",
];

function Premium() {
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
      const checkoutUrl = await SubscriptionService.createCheckoutUrl();
      if (!checkoutUrl) {
        toast.success("Demo mode: checkout simulated. Stripe opens once billing is enabled.");
        return;
      }
      window.location.assign(checkoutUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start checkout.";
      toast.error(message);
    } finally {
      setCheckingOut(false);
    }
  }

  async function openPortal() {
    setOpeningPortal(true);
    try {
      const portalUrl = await SubscriptionService.createPortalUrl();
      if (!portalUrl) toast.info("The billing portal is unavailable in demo mode.");
      else window.location.assign(portalUrl);
    } catch {
      toast.error("Unable to open billing management. Please try again.");
    } finally {
      setOpeningPortal(false);
    }
  }

  const endDate = subscription?.currentPeriodEnd
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(subscription.currentPeriodEnd),
      )
    : null;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Plans"
        title="Choose your NEXORA"
        description="Use the connected workspace for free. Upgrade when higher AI usage and advanced workflows improve your routine."
      />
      <div className="mt-4 text-sm text-muted-foreground">
        Current status:{" "}
        <span className="font-medium text-foreground">
          {isLoading ? "Checking…" : subscription?.isPremium ? "Premium" : "Free"}
        </span>
      </div>
      {checkoutResult === "success" && !subscription?.isPremium && (
        <div className="mt-4 rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm">
          Payment received. Your subscription is still syncing; access is granted only after Stripe
          confirms it.
          <Button
            className="ml-3"
            size="sm"
            variant="outline"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {isFetching ? "Checking…" : "Check again"}
          </Button>
        </div>
      )}
      {checkoutResult === "cancelled" && (
        <p className="mt-4 text-sm text-muted-foreground">
          Checkout was cancelled. No plan change was made.
        </p>
      )}
      {subscription?.status === "trialing" && (
        <p className="mt-3 text-sm text-gold">
          Your Stripe trial is active{endDate ? ` until ${endDate}` : ""}.
        </p>
      )}
      {subscription?.cancelAtPeriodEnd && subscription.isPremium && (
        <p className="mt-3 text-sm text-muted-foreground">
          Cancellation is scheduled. Premium remains available
          {endDate ? ` through ${endDate}` : " until the period ends"}.
        </p>
      )}
      {["past_due", "unpaid"].includes(subscription?.status ?? "") && (
        <p className="mt-3 text-sm text-destructive">
          Payment failed. Update your payment method to restore Premium.
        </p>
      )}
      {subscription?.isPremium && (
        <Button
          className="mt-4 rounded-full"
          variant="outline"
          onClick={openPortal}
          disabled={openingPortal}
        >
          {openingPortal ? "Opening…" : "Manage billing, payment or cancellation"}
        </Button>
      )}
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card
          badge={!subscription?.isPremium ? "Current" : undefined}
          name="Free"
          price="$0"
          period="forever"
          features={FREE}
          cta={
            <Button variant="outline" className="rounded-full" disabled>
              {subscription?.isPremium ? "Included foundation" : "Current plan"}
            </Button>
          }
        />
        <Card
          highlight
          badge="Most popular"
          name="Premium"
          price="$12"
          period="per month"
          features={PRO}
          cta={
            <Button
              className="rounded-full"
              onClick={startCheckout}
              disabled={checkingOut || isLoading || subscription?.isPremium}
              title="Start a Stripe checkout session"
            >
              <Crown className="mr-1 h-4 w-4" />
              {checkingOut
                ? "Starting checkout..."
                : subscription?.isPremium
                  ? "Premium active"
                  : "Upgrade to Premium"}
            </Button>
          }
        />
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Stripe checkout is wired through the public edge function and will redirect back to the
        Premium route.
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
          ? "border-[color:var(--gold)]/40 bg-[radial-gradient(120%_80%_at_50%_-20%,oklch(0.78_0.12_72/0.15),transparent_60%)]"
          : "border-border bg-surface"
      }`}
    >
      {badge && (
        <span
          className={`absolute right-6 top-6 rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-widest ${
            highlight ? "bg-gold text-gold-foreground" : "bg-surface-elevated text-muted-foreground"
          }`}
        >
          {badge}
        </span>
      )}
      <div className="flex items-center gap-2">
        {highlight ? <Crown className="h-5 w-5 text-gold" /> : <Sparkles className="h-5 w-5" />}
        <h3 className="font-display text-2xl">{name}</h3>
      </div>
      <p className="mt-6 flex items-baseline gap-2">
        <span className="font-display text-5xl">{price}</span>
        <span className="text-sm text-muted-foreground">{period}</span>
      </p>
      <ul className="mt-8 space-y-3 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <Check className="h-4 w-4 text-gold" /> {f}
          </li>
        ))}
      </ul>
      <div className="mt-8">{cta}</div>
    </div>
  );
}
