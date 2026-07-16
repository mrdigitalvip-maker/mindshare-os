import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, Check, Sparkles } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_shell/premium")({
  head: () => ({ meta: [{ title: "Premium — NEXORA" }] }),
  component: Premium,
});

const FREE = ["Assistant (basic)", "3 modules", "Local memory", "Community support"];
const PRO = [
  "Unlimited AI usage",
  "All 10 modules unlocked",
  "Custom Agents",
  "Priority support",
  "Sync across devices",
  "Advanced automations",
];

function Premium() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Plans"
        title="Choose your NEXORA"
        description="Free forever. Upgrade to Pro when you're ready to go deeper."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card
          badge="Current"
          name="Free"
          price="$0"
          period="forever"
          features={FREE}
          cta={<Button variant="outline" className="rounded-full" disabled>Current plan</Button>}
        />
        <Card
          highlight
          badge="Most popular"
          name="Pro"
          price="$12"
          period="per month"
          features={PRO}
          cta={
            <Button className="rounded-full" disabled title="Payments unlock when Cloud is connected">
              <Crown className="mr-1 h-4 w-4" /> Upgrade to Pro
            </Button>
          }
        />
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Payments will activate through Stripe and Google Play Billing once Cloud is connected.
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
