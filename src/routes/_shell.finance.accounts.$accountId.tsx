import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
import { EmptyState, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { FinanceService } from "@/services";
const money = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
export const Route = createFileRoute("/_shell/finance/accounts/$accountId")({
  component: AccountWorkspace,
});
function AccountWorkspace() {
  const { accountId } = Route.useParams();
  const nav = useNavigate();
  const account = useQuery({
    queryKey: ["workspace", "finance", "accounts", accountId],
    queryFn: () => FinanceService.getAccount(accountId),
  });
  const transactions = useQuery({
    queryKey: ["workspace", "finance", "accounts", accountId, "transactions"],
    queryFn: () => FinanceService.listAccountTransactions(accountId),
  });
  if (account.isLoading)
    return (
      <PageShell>
        <p>Loading account…</p>
      </PageShell>
    );
  if (!account.data)
    return (
      <PageShell>
        <EmptyState
          icon={Trash2}
          title="Account not found"
          description="It does not exist or does not belong to you."
        />
      </PageShell>
    );
  const income = (transactions.data ?? [])
      .filter((t) => t.type === "income")
      .reduce((n, t) => n + (t.amount ?? 0), 0),
    expenses = (transactions.data ?? [])
      .filter((t) => t.type === "expense")
      .reduce((n, t) => n + (t.amount ?? 0), 0);
  return (
    <PageShell>
      <Button variant="ghost" onClick={() => nav({ to: "/finance" })}>
        <ArrowLeft />
        Finance
      </Button>
      <h1 className="mt-5 text-3xl font-semibold">{account.data.name}</h1>
      <p className="mt-1 text-muted-foreground">
        {account.data.type} · {account.data.currency}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Balance", account.data.balance ?? 0],
          ["Income", income],
          ["Expenses", expenses],
        ].map(([l, v]) => (
          <div className="glass rounded-2xl p-5" key={l}>
            <p className="text-sm text-muted-foreground">{l}</p>
            <p className="mt-2 text-2xl font-semibold">{money.format(Number(v))}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-8 text-xl font-semibold">Recent activity</h2>
      <div className="mt-3 space-y-2">
        {transactions.data?.map((t) => (
          <div className="glass flex justify-between gap-3 rounded-xl p-4" key={t.id}>
            <span className="min-w-0 truncate">{t.title || t.category || "Transaction"}</span>
            <strong>
              {t.type === "expense" ? "−" : "+"}
              {money.format(t.amount ?? 0)}
            </strong>
          </div>
        ))}
        {!transactions.isLoading && !transactions.data?.length && (
          <p className="text-muted-foreground">
            No transactions in this account. Add one from Finance.
          </p>
        )}
      </div>
    </PageShell>
  );
}
