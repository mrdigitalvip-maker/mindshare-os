import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet, TrendingUp, PiggyBank, Crown, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-workspace";
import { makeWorkspaceId } from "@/lib/workspace-service";

export const Route = createFileRoute("/_shell/finance")({
  head: () => ({ meta: [{ title: "Finance — NEXORA" }] }),
  component: Finance,
});
function Finance() {
  const { state, update } = useWorkspace();
  const saved = state.financeGoals.reduce((a, g) => a + g.saved, 0);
  const target = state.financeGoals.reduce((a, g) => a + g.target, 0);
  function add() {
    update((s) => ({
      ...s,
      financeGoals: [
        {
          id: makeWorkspaceId("goal"),
          title: `Savings goal ${s.financeGoals.length + 1}`,
          saved: 0,
          target: 1000,
        },
        ...s.financeGoals,
      ],
    }));
    toast.success("Finance goal added");
  }
  return (
    <PageShell>
      <PageHeader
        eyebrow="Premium module"
        title="Finance"
        description="Track spending, plan budgets and forecast with AI."
        actions={
          <>
            <Button variant="outline" className="rounded-full" onClick={add}>
              <Plus className="mr-1 h-4 w-4" />
              New goal
            </Button>
            <Link to="/premium">
              <Button className="rounded-full">
                <Crown className="mr-1 h-4 w-4" /> Unlock with Pro
              </Button>
            </Link>
          </>
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
          { icon: PiggyBank, title: "Goals", copy: `${state.financeGoals.length} active` },
        ].map((c) => (
          <div key={c.title} className="glass rounded-2xl p-6">
            <c.icon className="h-5 w-5 text-gold" />
            <h3 className="mt-3 font-display text-xl">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.copy}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {state.financeGoals.map((g) => (
          <article key={g.id} className="glass rounded-2xl p-5">
            <h3 className="font-display text-xl">{g.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              ${g.saved.toLocaleString()} of ${g.target.toLocaleString()}
            </p>
            <div className="mt-4 h-2 rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-gold"
                style={{ width: `${Math.min(100, Math.round((g.saved / g.target) * 100))}%` }}
              />
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
