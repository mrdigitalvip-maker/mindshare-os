import { createFileRoute } from "@tanstack/react-router";
import { Wallet, TrendingUp, PiggyBank, Crown } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_shell/finance")({
  head: () => ({ meta: [{ title: "Finance — NEXORA" }] }),
  component: () => (
    <PageShell>
      <PageHeader
        eyebrow="Premium module"
        title="Finance"
        description="Track spending, plan budgets and forecast with AI."
        actions={
          <Link to="/premium">
            <Button className="rounded-full">
              <Crown className="mr-1 h-4 w-4" /> Unlock with Pro
            </Button>
          </Link>
        }
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { icon: Wallet, title: "Accounts", copy: "Connect banks & wallets" },
          { icon: TrendingUp, title: "Insights", copy: "AI-powered analysis" },
          { icon: PiggyBank, title: "Goals", copy: "Save with intention" },
        ].map((c) => (
          <div key={c.title} className="glass rounded-2xl p-6 opacity-70">
            <c.icon className="h-5 w-5 text-gold" />
            <h3 className="mt-3 font-display text-xl">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.copy}</p>
          </div>
        ))}
      </div>
    </PageShell>
  ),
});
