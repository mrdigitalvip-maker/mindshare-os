import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, TrendingUp, PiggyBank, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { FinanceService, type FinanceGoal } from "@/services";

export const Route = createFileRoute("/_shell/finance")({
  head: () => ({ meta: [{ title: "Finance — NEXORA" }] }),
  component: Finance,
});

function Finance() {
  const [goals, setGoals] = useState<FinanceGoal[]>([]);
  const saved = goals.reduce((total, goal) => total + goal.saved, 0);
  const target = goals.reduce((total, goal) => total + goal.target, 0);

  useEffect(() => {
    void FinanceService.listGoals().then(setGoals);
  }, []);

  async function addGoal() {
    const created = await FinanceService.createGoal();
    setGoals((current) => [created, ...current]);
    toast.success("Finance goal added");
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Premium module"
        title="Finance"
        description="Track spending, plan budgets and forecast with AI."
        actions={
          <Button className="rounded-full" onClick={addGoal}>
            <Plus className="mr-1 h-4 w-4" /> New goal
          </Button>
        }
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { icon: Wallet, title: "Accounts", copy: "$0 connected" },
          {
            icon: TrendingUp,
            title: "Insights",
            copy: target ? `${Math.round((saved / target) * 100)}% toward goals` : "No goals yet",
          },
          { icon: PiggyBank, title: "Goals", copy: `${goals.length} active` },
        ].map((card) => (
          <div key={card.title} className="glass rounded-2xl p-6 opacity-70">
            <card.icon className="h-5 w-5 text-gold" />
            <h3 className="mt-3 font-display text-xl">{card.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{card.copy}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {goals.map((goal) => (
          <article key={goal.id} className="glass rounded-2xl p-5">
            <h3 className="font-display text-xl">{goal.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              ${goal.saved.toLocaleString()} of ${goal.target.toLocaleString()}
            </p>
            <div className="mt-4 h-2 rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-gold"
                style={{ width: `${Math.min(100, Math.round((goal.saved / goal.target) * 100))}%` }}
              />
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
