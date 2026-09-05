import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Copy, Play, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "@/lib/clipboard";
import { PageShell, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentService } from "@/services";
import { useSubscription } from "@/hooks/use-subscription";
export const Route = createFileRoute("/_shell/agents/$agentId")({ component: AgentWorkspace });
function AgentWorkspace() {
  const { agentId } = Route.useParams();
  const nav = useNavigate();
  const client = useQueryClient();
  const sub = useSubscription();
  const agent = useQuery({
    queryKey: ["workspace", "agents", agentId],
    queryFn: async () => (await AgentService.listRows()).find((a) => a.id === agentId) ?? null,
  });
  const runs = useQuery({
    queryKey: ["workspace", "agent-runs", agentId],
    queryFn: () => AgentService.listRuns(agentId),
  });
  const [input, setInput] = useState("");
  const [context, setContext] = useState("");
  const [output, setOutput] = useState("");
  const run = useMutation({
    mutationFn: () =>
      AgentService.run(
        agentId,
        context.trim() ? `Context:\n${context}\n\nRequest:\n${input}` : input,
      ),
    onSuccess: async (r) => {
      setOutput(r.output);
      await client.invalidateQueries({ queryKey: ["workspace", "agent-runs", agentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (agent.isLoading)
    return (
      <PageShell>
        <p>Carregando…</p>
      </PageShell>
    );
  if (!agent.data)
    return (
      <PageShell>
        <EmptyState
          icon={Bot}
          title="Agente não encontrado"
          description="Ele não existe ou não pertence a você."
        />
      </PageShell>
    );
  const a = agent.data;
  return (
    <PageShell>
      <p className="text-xs uppercase text-muted-foreground">Workspace do agente</p>
      <h1 className="font-display text-3xl">{a.name}</h1>
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="run">Executar</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="glass mt-4 rounded-2xl p-5">
            <h2 className="font-semibold">Objetivo</h2>
            <p className="mt-2 text-muted-foreground">{a.goal || "Não informado"}</p>
            <h2 className="mt-5 font-semibold">Comportamento</h2>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
              {a.instructions || "Não informado"}
            </p>
            <p className="mt-4 text-sm">Capacidades: {a.capabilities.join(", ") || "nenhuma"}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border p-3">
                <span className="text-muted-foreground">Status</span>
                <p className="mt-1 font-medium">{a.active ? "Active" : "Inactive"}</p>
              </div>
              <div className="rounded-xl border p-3">
                <span className="text-muted-foreground">Recent usage</span>
                <p className="mt-1 font-medium">{runs.data?.length ?? 0} runs</p>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="run">
          <div className="mt-4 space-y-3">
            <Label>Solicitação</Label>
            <Textarea
              className="min-h-32"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Descreva o trabalho para o agente…"
            />
            <Label>Context (optional)</Label>
            <Textarea
              className="min-h-20"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Constraints, audience, source material…"
            />
            <Button
              disabled={!input.trim() || run.isPending || !sub.data?.isPremium}
              onClick={() => run.mutate()}
            >
              <Play />
              {run.isPending ? "Executando…" : "Executar"}
            </Button>
            {!sub.data?.isPremium && (
              <p className="text-sm text-destructive">Uma assinatura Premium ativa é necessária.</p>
            )}
            {run.isError && (
              <p role="alert" className="text-sm text-destructive">
                The run failed. Your input is still here so you can retry.
              </p>
            )}
            {output && (
              <div className="glass rounded-xl p-4">
                <div className="mb-3 flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await copyText(output);
                        toast.success("Copied");
                      } catch {
                        toast.error("Could not copy the result.");
                      }
                    }}
                  >
                    <Copy />
                    Copy
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => run.mutate()}>
                    <RefreshCw />
                    Run again
                  </Button>
                </div>
                <div className="whitespace-pre-wrap">{output}</div>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="history">
          <div className="mt-4 space-y-3">
            {runs.data?.map((r) => (
              <details key={r.id} className="glass rounded-xl p-4">
                <summary className="min-h-11 cursor-pointer py-2">
                  <span className="font-medium">{r.status}</span> ·{" "}
                  {new Date(r.created_at || r.started_at || "").toLocaleString("pt-BR")}
                </summary>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {typeof r.input === "string" ? r.input : "Saved input"}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm">
                  {typeof r.output === "string"
                    ? r.output
                    : r.error_code || "Execução em andamento"}
                </p>
              </details>
            ))}
            {!runs.data?.length && <p className="text-muted-foreground">Nenhuma execução ainda.</p>}
          </div>
        </TabsContent>
        <TabsContent value="settings">
          <Settings
            agent={a}
            onDelete={async () => {
              await AgentService.remove(a.id);
              nav({ to: "/agents" });
            }}
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
function Settings({
  agent,
  onDelete,
}: {
  agent: Awaited<ReturnType<typeof AgentService.listRows>>[number];
  onDelete: () => void;
}) {
  const [name, setName] = useState(agent.name ?? "");
  const [description, setDescription] = useState(agent.description ?? "");
  const [goal, setGoal] = useState(agent.goal ?? "");
  const [instructions, setInstructions] = useState(agent.instructions ?? "");
  const [active, setActive] = useState(!!agent.active);
  const save = useMutation({
    mutationFn: () =>
      AgentService.update(agent.id, { name, description, goal, instructions, active }),
    onSuccess: () => toast.success("Agente atualizado"),
  });
  return (
    <div className="mt-4 max-w-xl space-y-3">
      <Label>Nome</Label>
      <Input value={name} onChange={(e) => setName(e.target.value)} />
      <Label>Descrição</Label>
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      <Label>Objetivo</Label>
      <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} />
      <Label>Instruções</Label>
      <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      <label className="flex items-center justify-between rounded-xl border p-3">
        Agente ativo
        <Switch checked={active} onCheckedChange={setActive} />
      </label>
      <div className="flex gap-2">
        <Button onClick={() => save.mutate()}>Salvar</Button>
        <Button variant="destructive" onClick={() => confirm("Excluir agente?") && onDelete()}>
          <Trash2 />
          Excluir
        </Button>
      </div>
    </div>
  );
}
