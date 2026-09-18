import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
import { EmptyState, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { FinanceService } from "@/services";
import { useLanguage } from "@/providers/language-provider";
export const Route = createFileRoute("/_shell/finance/accounts/$accountId")({
  component: AccountWorkspace,
});
function AccountWorkspace() {
  const { resolvedLocale } = useLanguage();
  const L = (pt: string, en: string) => (resolvedLocale === "pt-BR" ? pt : en);
  const money = new Intl.NumberFormat(resolvedLocale, { style: "currency", currency: "USD" });
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
        <p>{L("Carregando conta…", "Loading account…")}</p>
      </PageShell>
    );
  if (!account.data)
    return (
      <PageShell>
        <EmptyState
          icon={Trash2}
          title={L("Conta não encontrada", "Account not found")}
          description={L("Ela não existe ou não pertence a você.", "It does not exist or does not belong to you.")}
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
        {L("Finanças", "Finance")}
      </Button>
      <h1 className="mt-5 text-3xl font-semibold">{account.data.name}</h1>
      <p className="mt-1 text-muted-foreground">
        {account.data.type} · {account.data.currency}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          [L("Saldo", "Balance"), account.data.balance ?? 0],
          [L("Receitas", "Income"), income],
          [L("Despesas", "Expenses"), expenses],
        ].map(([l, v]) => (
          <div className="v2-surface rounded-2xl p-5" key={l}>
            <p className="text-sm text-muted-foreground">{l}</p>
            <p className="mt-2 text-2xl font-semibold">{money.format(Number(v))}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-8 text-xl font-semibold">{L("Atividade recente", "Recent activity")}</h2>
      <div className="mt-3 space-y-2">
        {transactions.data?.map((t) => (
          <div className="v2-surface flex justify-between gap-3 rounded-2xl p-4" key={t.id}>
            <span className="min-w-0 truncate">{t.title || t.category || L("Transação", "Transaction")}</span>
            <strong>
              {t.type === "expense" ? "−" : "+"}
              {money.format(t.amount ?? 0)}
            </strong>
          </div>
        ))}
        {!transactions.isLoading && !transactions.data?.length && (
          <p className="text-muted-foreground">
            {L("Nenhuma transação nesta conta. Adicione uma pela tela de Finanças.", "No transactions in this account. Add one from Finance.")}
          </p>
        )}
      </div>
    </PageShell>
  );
}
