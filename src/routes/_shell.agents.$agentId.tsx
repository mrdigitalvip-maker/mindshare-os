import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CalendarClock, Copy, Play, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "@/lib/clipboard";
import { PageShell, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentScheduleService, AgentService, type AgentSchedule } from "@/services";
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
  const schedule = useQuery({
    queryKey: ["workspace", "agent-schedule", agentId],
    queryFn: () => AgentScheduleService.get(agentId),
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
      await Promise.all([
        client.invalidateQueries({ queryKey: ["workspace", "agent-runs", agentId] }),
        client.invalidateQueries({ queryKey: ["workspace", "agent-schedule", agentId] }),
      ]);
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
        <EmptyState icon={Bot} title="Agente não encontrado" description="Ele não existe ou não pertence a você." />
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
          <TabsTrigger value="schedule">Agendar</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="glass mt-4 rounded-2xl p-5">
            <h2 className="font-semibold">Objetivo</h2>
            <p className="mt-2 text-muted-foreground">{a.goal || "Não informado"}</p>
            <h2 className="mt-5 font-semibold">Comportamento</h2>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{a.instructions || "Não informado"}</p>
            <p className="mt-4 text-sm">Capacidades: {a.capabilities.join(", ") || "nenhuma"}</p>
            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl border p-3">
                <span className="text-muted-foreground">Status</span>
                <p className="mt-1 font-medium">{a.active ? "Ativo" : "Inativo"}</p>
              </div>
              <div className="rounded-xl border p-3">
                <span className="text-muted-foreground">Execuções recentes</span>
                <p className="mt-1 font-medium">{runs.data?.length ?? 0}</p>
              </div>
              <div className="rounded-xl border p-3">
                <span className="text-muted-foreground">Automação</span>
                <p className="mt-1 font-medium">{schedule.data?.frequency ? scheduleLabel(schedule.data) : "Manual"}</p>
              </div>
            </div>
            {schedule.data?.nextRunAt && (
              <p className="mt-4 text-sm text-muted-foreground">
                Próxima execução: {new Date(schedule.data.nextRunAt).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="run">
          <div className="mt-4 space-y-3">
            <Label>Solicitação</Label>
            <Textarea className="min-h-32" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Descreva o trabalho para o agente…" />
            <Label>Contexto (opcional)</Label>
            <Textarea className="min-h-20" value={context} onChange={(e) => setContext(e.target.value)} placeholder="Restrições, audiência ou material de origem…" />
            <Button disabled={!input.trim() || run.isPending || !sub.data?.isPremium} onClick={() => run.mutate()}>
              <Play /> {run.isPending ? "Executando…" : "Executar"}
            </Button>
            {!sub.data?.isPremium && <p className="text-sm text-destructive">Uma assinatura Premium ativa é necessária.</p>}
            {run.isError && <p role="alert" className="text-sm text-destructive">A execução falhou. Seu texto foi preservado para nova tentativa.</p>}
            {output && (
              <div className="glass rounded-xl p-4">
                <div className="mb-3 flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={async () => { try { await copyText(output); toast.success("Copiado"); } catch { toast.error("Não foi possível copiar o resultado."); } }}>
                    <Copy /> Copiar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => run.mutate()}><RefreshCw /> Executar novamente</Button>
                </div>
                <div className="whitespace-pre-wrap">{output}</div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          {schedule.isLoading ? (
            <p className="mt-4 text-muted-foreground">Carregando agendamento…</p>
          ) : (
            <ScheduleEditor
              key={`${schedule.data?.frequency ?? "none"}-${schedule.data?.nextRunAt ?? "new"}`}
              agentId={agentId}
              agentGoal={a.goal || a.description || ""}
              schedule={schedule.data}
              premium={!!sub.data?.isPremium}
              onChanged={async () => {
                await Promise.all([
                  client.invalidateQueries({ queryKey: ["workspace", "agent-schedule", agentId] }),
                  client.invalidateQueries({ queryKey: ["workspace", "agent-runs", agentId] }),
                ]);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="history">
          <div className="mt-4 space-y-3">
            {runs.data?.map((r) => {
              const detailed = r as typeof r & { trigger?: string; scheduled_for?: string | null };
              return (
                <details key={r.id} className="glass rounded-xl p-4">
                  <summary className="min-h-11 cursor-pointer py-2">
                    <span className="font-medium">{r.status}</span> · {detailed.trigger === "scheduled" ? "Programado" : "Manual"} · {new Date(r.created_at || r.started_at || "").toLocaleString("pt-BR")}
                  </summary>
                  {detailed.scheduled_for && <p className="text-xs text-muted-foreground">Previsto para {new Date(detailed.scheduled_for).toLocaleString("pt-BR")}</p>}
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{typeof r.input === "string" ? r.input : "Entrada salva"}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm">{typeof r.output === "string" ? r.output : r.error_code || "Execução em andamento"}</p>
                </details>
              );
            })}
            {!runs.data?.length && <p className="text-muted-foreground">Nenhuma execução ainda.</p>}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Settings agent={a} onDelete={async () => { await AgentService.remove(a.id); nav({ to: "/agents" }); }} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

const WEEKDAYS = [
  [1, "Seg"], [2, "Ter"], [3, "Qua"], [4, "Qui"], [5, "Sex"], [6, "Sáb"], [7, "Dom"],
] as const;

function ScheduleEditor({ agentId, agentGoal, schedule, premium, onChanged }: { agentId: string; agentGoal: string; schedule: AgentSchedule | null | undefined; premium: boolean; onChanged: () => Promise<void> }) {
  const [frequency, setFrequency] = useState<"daily" | "weekly">(schedule?.frequency ?? "daily");
  const [localTime, setLocalTime] = useState(schedule?.localTime ?? "08:00");
  const [weekdays, setWeekdays] = useState<number[]>(schedule?.weekdays.length ? schedule.weekdays : [1]);
  const [timezone, setTimezone] = useState(schedule?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC");
  const [prompt, setPrompt] = useState(schedule?.prompt ?? agentGoal);
  const [notify, setNotify] = useState(schedule?.notifyOnRun ?? true);
  const save = useMutation({
    mutationFn: () => AgentScheduleService.configure({ agentId, frequency, localTime, weekdays, timezone, prompt, notifyOnRun: notify }),
    onSuccess: async () => { await onChanged(); toast.success("Agendamento salvo"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const clear = useMutation({
    mutationFn: () => AgentScheduleService.clear(agentId),
    onSuccess: async () => { await onChanged(); toast.success("Agendamento removido"); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mt-4 max-w-2xl space-y-4">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-1 h-5 w-5 text-intelligence" />
          <div>
            <h2 className="font-semibold">Briefing programado</h2>
            <p className="mt-1 text-sm text-muted-foreground">Executa este Agent no servidor, mesmo com o app fechado. Nesta edição ele usa somente o objetivo, instruções e briefing configurados; acesso automático ao seu workspace será adicionado pelo Agentic Core.</p>
          </div>
        </div>
      </div>
      {!premium && <p className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">Agendamentos de Agents exigem Premium ativo.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2"><Label>Frequência</Label><select className="h-10 w-full rounded-md border bg-background px-3" value={frequency} onChange={(e) => setFrequency(e.target.value as "daily" | "weekly")}><option value="daily">Todos os dias</option><option value="weekly">Semanal</option></select></label>
        <label className="space-y-2"><Label>Horário local</Label><Input type="time" value={localTime} onChange={(e) => setLocalTime(e.target.value)} /></label>
      </div>
      {frequency === "weekly" && <div><Label>Dias</Label><div className="mt-2 flex flex-wrap gap-2">{WEEKDAYS.map(([day,label]) => <Button key={day} type="button" size="sm" variant={weekdays.includes(day) ? "default" : "outline"} onClick={() => setWeekdays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day])}>{label}</Button>)}</div></div>}
      <label className="space-y-2"><Label>Fuso horário</Label><Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/Bahia" /></label>
      <label className="space-y-2"><Label>O que o Agent deve executar</Label><Textarea className="min-h-28" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ex.: Prepare meu briefing semanal de conteúdo com base nas instruções deste Agent." /></label>
      <label className="flex items-center justify-between rounded-xl border p-3"><span><span className="block font-medium">Notificar ao concluir</span><span className="text-xs text-muted-foreground">Cria notificação no KIVRYN e envia push fora do horário silencioso.</span></span><Switch checked={notify} onCheckedChange={setNotify} /></label>
      {schedule?.nextRunAt && <div className="rounded-xl border p-3 text-sm"><p><span className="text-muted-foreground">Próxima:</span> {new Date(schedule.nextRunAt).toLocaleString("pt-BR")}</p>{schedule.lastRunAt && <p className="mt-1"><span className="text-muted-foreground">Última:</span> {new Date(schedule.lastRunAt).toLocaleString("pt-BR")}</p>}</div>}
      <div className="flex flex-wrap gap-2"><Button disabled={!premium || save.isPending || !prompt.trim()} onClick={() => save.mutate()}>{save.isPending ? "Salvando…" : schedule?.frequency ? "Atualizar agendamento" : "Ativar agendamento"}</Button>{schedule?.frequency && <Button variant="outline" disabled={clear.isPending} onClick={() => clear.mutate()}>Desativar</Button>}</div>
    </div>
  );
}

function scheduleLabel(schedule: AgentSchedule) {
  if (!schedule.frequency) return "Manual";
  if (schedule.frequency === "daily") return `Diário · ${schedule.localTime ?? "—"}`;
  const labels = schedule.weekdays.map((day) => WEEKDAYS.find(([value]) => value === day)?.[1]).filter(Boolean).join(", ");
  return `${labels || "Semanal"} · ${schedule.localTime ?? "—"}`;
}

function Settings({ agent, onDelete }: { agent: Awaited<ReturnType<typeof AgentService.listRows>>[number]; onDelete: () => void }) {
  const [name, setName] = useState(agent.name ?? "");
  const [description, setDescription] = useState(agent.description ?? "");
  const [goal, setGoal] = useState(agent.goal ?? "");
  const [instructions, setInstructions] = useState(agent.instructions ?? "");
  const [active, setActive] = useState(!!agent.active);
  const save = useMutation({ mutationFn: () => AgentService.update(agent.id, { name, description, goal, instructions, active }), onSuccess: () => toast.success("Agente atualizado") });
  return (
    <div className="mt-4 max-w-xl space-y-3">
      <Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} />
      <Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      <Label>Objetivo</Label><Textarea value={goal} onChange={(e) => setGoal(e.target.value)} />
      <Label>Instruções</Label><Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      <label className="flex items-center justify-between rounded-xl border p-3">Agente ativo<Switch checked={active} onCheckedChange={setActive} /></label>
      <div className="flex gap-2"><Button onClick={() => save.mutate()}>Salvar</Button><Button variant="destructive" onClick={() => confirm("Excluir agente?") && onDelete()}><Trash2 /> Excluir</Button></div>
    </div>
  );
}
