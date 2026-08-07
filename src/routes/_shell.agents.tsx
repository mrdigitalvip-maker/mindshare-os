import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Crown, Plus } from "lucide-react";
import { useState } from "react";
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
  const subscription = useSubscription();
  const query = useQuery({
    queryKey: workspaceQueryKeys.agents,
    queryFn: () => AgentService.listRows(),
  });
  return (
    <PageShell>
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
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-4">
          <p className="text-sm">
            <Crown className="mr-2 inline h-4 w-4 text-gold" />
            Agentes são exclusivos do Premium.
          </p>
          <Link to="/premium">
            <Button size="sm">Ver Premium</Button>
          </Link>
        </div>
      )}
      {!query.data?.length ? (
        <EmptyState
          icon={Bot}
          title="Nenhum agente"
          description="Use o construtor para definir objetivo, comportamento e capacidades."
        />
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {query.data.map((a) => (
            <Link
              to="/agents/$agentId"
              params={{ agentId: a.id }}
              key={a.id}
              className="glass rounded-2xl p-6 transition hover:border-gold/40"
            >
              <Bot className="text-gold" />
              <h2 className="mt-3 font-display text-xl">{a.name}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {a.goal || a.description}
              </p>
              <span className="mt-4 inline-flex rounded-full border px-2 py-1 text-xs">
                {a.active ? "Ativo" : "Inativo"}
              </span>
            </Link>
          ))}
        </div>
      )}
      <Builder open={builder} close={() => setBuilder(false)} />
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
          <DialogTitle>Novo agente · etapa {step} de 4</DialogTitle>
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
            <Label>Objetivo</Label>
            <Textarea value={form.goal} onChange={(e) => field("goal", e.target.value)} />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <Label>Instruções</Label>
            <Textarea
              value={form.instructions}
              onChange={(e) => field("instructions", e.target.value)}
            />
            <Label>Tom</Label>
            <Input value={form.tone} onChange={(e) => field("tone", e.target.value)} />
            <Label>Formato esperado</Label>
            <Textarea
              value={form.expected_output}
              onChange={(e) => field("expected_output", e.target.value)}
            />
          </div>
        )}
        {step === 3 && (
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
        {step === 4 && (
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
            onClick={() => (step < 4 ? setStep(step + 1) : create.mutate())}
          >
            {step < 4 ? "Continuar" : "Criar agente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
