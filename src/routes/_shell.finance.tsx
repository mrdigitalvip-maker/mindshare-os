import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FinanceService, workspaceQueryKeys } from "@/services";

export const Route = createFileRoute("/_shell/finance")({
  head: () => ({ meta: [{ title: "Finance — NEXORA" }] }),
  component: Finance,
});
type Account = Awaited<ReturnType<typeof FinanceService.listAccounts>>[number];
type Transaction = Awaited<ReturnType<typeof FinanceService.listTransactions>>[number];
type Editor = { kind: "account"; value?: Account } | { kind: "transaction"; value?: Transaction };
const money = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });

function Finance() {
  const client = useQueryClient();
  const [editor, setEditor] = useState<Editor>();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const accounts = useQuery({
    queryKey: [...workspaceQueryKeys.finance, "accounts"],
    queryFn: FinanceService.listAccounts,
  });
  const transactions = useQuery({
    queryKey: [...workspaceQueryKeys.finance, "transactions"],
    queryFn: FinanceService.listTransactions,
  });
  const summary = useQuery({
    queryKey: [...workspaceQueryKeys.finance, "summary"],
    queryFn: FinanceService.getSummary,
  });
  const refresh = () => client.invalidateQueries({ queryKey: workspaceQueryKeys.finance });
  const removeAccount = useMutation({
    mutationFn: FinanceService.removeAccount,
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const removeTransaction = useMutation({
    mutationFn: FinanceService.removeTransaction,
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const visible = useMemo(
    () =>
      (transactions.data ?? []).filter((item) => {
        const matchesText = `${item.title ?? ""} ${item.category ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
        return matchesText && (kind === "all" || item.type === kind);
      }),
    [transactions.data, search, kind],
  );
  const accountName = (id: string | null) =>
    accounts.data?.find((account) => account.id === id)?.name ?? "No account";

  return (
    <PageShell>
      <PageHeader
        eyebrow="Personal"
        title="Finance"
        description="Accounts and transactions from your private workspace."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditor({ kind: "account" })}>
              <Plus /> Account
            </Button>
            <Button onClick={() => setEditor({ kind: "transaction" })}>
              <Plus /> Transaction
            </Button>
          </div>
        }
      />
      <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Financial summary">
        {[
          { label: "Balance", value: summary.data?.balance },
          { label: "Income", value: summary.data?.income },
          { label: "Expenses", value: summary.data?.expenses },
        ].map((item) => (
          <div className="glass rounded-2xl p-5" key={item.label}>
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold">
              {summary.isLoading ? "…" : money.format(item.value ?? 0)}
            </p>
          </div>
        ))}
      </section>
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Accounts</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {accounts.data?.map((account) => (
            <article className="glass rounded-2xl p-5" key={account.id}>
              <div className="flex items-start justify-between">
                <div>
                  <Wallet className="h-5 w-5 text-gold" />
                  <h3 className="mt-3 text-lg font-medium">{account.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {account.type} · {money.format(Number(account.balance ?? 0))}
                  </p>
                </div>
                <div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${account.name}`}
                    onClick={() => setEditor({ kind: "account", value: account })}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${account.name}`}
                    onClick={() =>
                      confirm(`Delete ${account.name}?`) && removeAccount.mutate(account.id)
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Transaction history</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search description or category"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-11 rounded-md border border-input bg-background px-3"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        {!transactions.isLoading && !visible.length ? (
          <EmptyState
            icon={Wallet}
            title="No transactions"
            description="Add income or an expense to start your history."
          />
        ) : (
          <div className="mt-4 space-y-2">
            {visible.map((item) => (
              <article className="glass flex items-center gap-3 rounded-xl p-4" key={item.id}>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium">
                    {item.title || item.category || "Transaction"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {accountName(item.account_id)} ·{" "}
                    {item.transaction_date
                      ? new Date(item.transaction_date).toLocaleDateString()
                      : "No date"}
                  </p>
                </div>
                <strong className={item.type === "income" ? "text-emerald-500" : "text-foreground"}>
                  {item.type === "expense" ? "−" : "+"}
                  {money.format(Number(item.amount))}
                </strong>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditor({ kind: "transaction", value: item })}
                  aria-label="Edit transaction"
                >
                  <Pencil />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    confirm("Delete this transaction?") && removeTransaction.mutate(item.id)
                  }
                  aria-label="Delete transaction"
                >
                  <Trash2 />
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>
      <FinanceDialog
        editor={editor}
        accounts={accounts.data ?? []}
        close={() => setEditor(undefined)}
        saved={async () => {
          await refresh();
          setEditor(undefined);
        }}
      />
    </PageShell>
  );
}

function FinanceDialog({
  editor,
  accounts,
  close,
  saved,
}: {
  editor?: Editor;
  accounts: Account[];
  close: () => void;
  saved: () => void;
}) {
  const account = editor?.kind === "account" ? editor.value : undefined;
  const transaction = editor?.kind === "transaction" ? editor.value : undefined;
  const [name, setName] = useState(account?.name ?? "");
  const [accountType, setAccountType] = useState(account?.type ?? "checking");
  const [balance, setBalance] = useState(String(account?.balance ?? 0));
  const [description, setDescription] = useState(transaction?.title ?? "");
  const [amount, setAmount] = useState(String(transaction?.amount ?? ""));
  const [type, setType] = useState(transaction?.type ?? "expense");
  const [accountId, setAccountId] = useState(transaction?.account_id ?? accounts[0]?.id ?? "");
  const [date, setDate] = useState(
    transaction?.transaction_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const save = useMutation({
    mutationFn: async () => {
      if (editor?.kind === "account") {
        if (!name.trim()) throw new Error("Account name is required");
        const patch = { name: name.trim(), type: accountType, balance: Number(balance) };
        if (account) await FinanceService.updateAccount(account.id, patch);
        else await FinanceService.createAccount(patch);
      } else {
        if (!accountId || !amount || Number(amount) <= 0)
          throw new Error("Choose an account and enter a positive amount");
        const patch = {
          account_id: accountId,
          title: description.trim() || null,
          amount: Number(amount),
          type,
          transaction_date: date,
        };
        if (transaction) await FinanceService.updateTransaction(transaction.id, patch);
        else await FinanceService.createTransaction(patch);
      }
    },
    onSuccess: () => {
      toast.success(editor?.kind === "account" ? "Account saved" : "Transaction saved");
      saved();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={!!editor} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editor?.kind === "account"
              ? `${account ? "Edit" : "New"} account`
              : `${transaction ? "Edit" : "New"} transaction`}
          </DialogTitle>
        </DialogHeader>
        {editor?.kind === "account" ? (
          <div className="space-y-4">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Type">
              <select
                className="h-11 w-full rounded-md border bg-background px-3"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </Field>
            <Field label="Opening balance">
              <Input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </Field>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Description">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Amount">
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
              <Field label="Type">
                <select
                  className="h-11 w-full rounded-md border bg-background px-3"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </Field>
            </div>
            <Field label="Account">
              <select
                className="h-11 w-full rounded-md border bg-background px-3"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">Choose account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
