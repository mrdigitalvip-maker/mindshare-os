import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Crown, Play, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageShell, PageHeader, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AgentService, workspaceQueryKeys } from "@/services";
import { useSubscription } from "@/hooks/use-subscription";
import { MetricCard, PremiumGate, WorkspaceShell } from "@/components/workspace-ui";
export const Route = createFileRoute("/_shell/agents")({
  head: () => ({ meta: [{ title: "Agentes — NEXORA" }] }),
  component: Agents,
});
const capabilities = [
  ["writing", "Escrita"],
  ["planning", "Planejamento"],
  ["summarization", "Resumos"],
  ["study", "Estudos"],
  ["productivity", "Produtividade"],
];
function Agents() {
  const [builder, setBuilder] = useState(false);
  const [search, setSearch] = useState("");
  const subscription = useSubscription();
  const query = useQuery({
    queryKey: workspaceQueryKeys.agents,
    queryFn: () => AgentService.listRows(),
  });
  const runs = useQuery({
    queryKey: ["workspace", "agent-runs"],
    queryFn: () => AgentService.listRuns(),
  });
  const visible = useMemo(
    () =>
      (query.data ?? []).filter((agent) =>
        `${agent.name} ${agent.goal} ${agent.description}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [query.data, search],
  );
  const lastRun = (agentId: string) => runs.data?.find((run) => run.agent_id === agentId);
  return (
    <PageShell>
      <WorkspaceShell>
        <PageHeader
          eyebrow="Recurso Premium"
          title="Agentes"
          description="Crie assistentes especializados e execute trabalhos sob demanda."
          actions={
            <Button
              onClick={() =>
                subscription.data?.isPremium
                  ? setBuilder(true)
                  : toast.error("Faça upgrade para criar e executar agentes.")
              }
            >
              <Plus />
              Novo agente
            </Button>
          }
        />
        {!subscription.data?.isPremium && (
          <PremiumGate>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                <Crown className="mr-2 inline h-4 w-4 text-gold" />
                Agentes são exclusivos do Premium.
              </p>
              <Link to="/premium">
                <Button size="sm">Ver Premium</Button>
              </Link>
            </div>
          </PremiumGate>
        )}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <MetricCard
            label="Active agents"
            value={(query.data ?? []).filter((a) => a.active).length}
          />
          <MetricCard label="Recent runs" value={(runs.data ?? []).length} hint="Persisted runs" />
          <MetricCard
            label="Last execution"
            value={
              runs.data?.[0]
                ? new Date(runs.data[0].started_at || runs.data[0].created_at).toLocaleDateString()
                : "—"
            }
          />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            aria-label="Search agents"
            placeholder="Search by name or purpose"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!visible.length ? (
          <EmptyState
            icon={Bot}
            title={search ? "No agents match your search" : "Build a reusable AI worker"}
            description={
              search
                ? "Try a different name or purpose."
                : "Define a purpose, instructions and supported capabilities once, then run it whenever the work returns."
            }
            action={
              !search && (
                <Button
                  onClick={() =>
                    subscription.data?.isPremium
                      ? setBuilder(true)
                      : toast.error("Premium is required.")
                  }
                >
                  <Plus />
                  Create your first agent
                </Button>
              )
            }
          />
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((a) => {
              const recent = lastRun(a.id);
              return (
                <article key={a.id} className="glass min-w-0 rounded-2xl p-6">
                  <Bot className="text-gold" />
                  <h2 className="mt-3 font-display text-xl">{a.name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {a.goal || a.description}
                  </p>
                  <span className="mt-4 inline-flex rounded-full border px-2 py-1 text-xs">
                    {a.active ? "Ativo" : "Inativo"}
                  </span>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Last run:{" "}
                    {recent
                      ? new Date(recent.started_at || recent.created_at).toLocaleString()
                      : "Never"}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Link to="/agents/$agentId" params={{ agentId: a.id }}>
                      <Button variant="outline">Open</Button>
                    </Link>
                    <Link
                      to="/agents/$agentId"
                      params={{ agentId: a.id }}
                      search={{ tab: "run" } as never}
                    >
                      <Button disabled={!a.active}>
                        <Play />
                        Run
                      </Button>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <Builder open={builder} close={() => setBuilder(false)} />
      </WorkspaceShell>
    </PageShell>
  );
}
function Builder({ open, close }: { open: boolean; close: () => void }) {
  const client = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    description: "",
    goal: "",
    instructions: "",
    tone: "Profissional",
    expected_output: "",
    capabilities: [] as string[],
  });
  const field = (k: string, v: string) => setForm((c) => ({ ...c, [k]: v }));
  const create = useMutation({
    mutationFn: () => AgentService.create({ ...form, active: true }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: workspaceQueryKeys.agents });
      toast.success("Agente criado");
      close();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo agente · etapa {step} de 5</DialogTitle>
        </DialogHeader>
        {step === 1 && (
          <div className="space-y-3">
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => field("name", e.target.value)} />
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => field("description", e.target.value)}
            />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <Label>What should this agent do?</Label>
            <Textarea value={form.goal} onChange={(e) => field("goal", e.target.value)} />
            <Label>What result should it produce?</Label>
            <Textarea
              value={form.expected_output}
              onChange={(e) => field("expected_output", e.target.value)}
            />
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <Label>Instruções</Label>
            <Textarea
              value={form.instructions}
              onChange={(e) => field("instructions", e.target.value)}
            />
            <Label>Tom</Label>
            <Input value={form.tone} onChange={(e) => field("tone", e.target.value)} />
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3">
            {capabilities.map(([value, label]) => (
              <label className="flex items-center gap-3 rounded-xl border p-3" key={value}>
                <Checkbox
                  checked={form.capabilities.includes(value)}
                  onCheckedChange={(checked) =>
                    setForm((c) => ({
                      ...c,
                      capabilities: checked
                        ? [...c.capabilities, value]
                        : c.capabilities.filter((x) => x !== value),
                    }))
                  }
                />
                {label}
              </label>
            ))}
          </div>
        )}
        {step === 5 && (
          <div className="rounded-xl border p-4">
            <h3 className="font-display text-xl">{form.name}</h3>
            <p className="mt-2 text-sm">{form.goal}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              {form.capabilities.map((v) => capabilities.find((c) => c[0] === v)?.[1]).join(" · ")}
            </p>
          </div>
        )}
        <div className="mt-4 flex justify-between">
          <Button variant="outline" onClick={() => (step === 1 ? close() : setStep(step - 1))}>
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>
          <Button
            disabled={(step === 1 && !form.name.trim()) || create.isPending}
            onClick={() => (step < 5 ? setStep(step + 1) : create.mutate())}
          >
            {step < 5 ? "Continuar" : "Criar agente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
