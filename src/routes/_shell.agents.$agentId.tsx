import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CalendarClock, Copy, Play, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "@/lib/clipboard";
import { PageShell, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AgentRuntimeService,
  AgentScheduleService,
  AgentService,
  type AgentActionAuditStatus,
  type AgentSchedule,
  type PendingAgentPlan,
} from "@/services";
import { useSubscription } from "@/hooks/use-subscription";

type AgentTab = "overview" | "run" | "schedule" | "history" | "settings";
const agentTabs = new Set<AgentTab>(["overview", "run", "schedule", "history", "settings"]);

export const Route = createFileRoute("/_shell/agents/$agentId")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab:
      typeof search.tab === "string" && agentTabs.has(search.tab as AgentTab)
        ? (search.tab as AgentTab)
        : undefined,
  }),
  component: AgentWorkspace,
});

function AgentWorkspace() {
  const { agentId } = Route.useParams();
  const { tab } = Route.useSearch();
  const nav = useNavigate();
  const client = useQueryClient();
  const sub = useSubscription();
  const premium = sub.data?.isPremium === true;
  const entitlementLoading = sub.isPending && !sub.data;
  const entitlementError = sub.isError;
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
  const pendingPlans = useQuery({
    queryKey: ["workspace", "agent-pending-plans", agentId],
    queryFn: () => AgentRuntimeService.listPending(agentId),
  });
  const actionAudit = useQuery({
    queryKey: ["workspace", "agent-action-audit", agentId],
    queryFn: () => AgentRuntimeService.listAudit(agentId),
  });
  const [input, setInput] = useState("");
  const [context, setContext] = useState("");
  const [output, setOutput] = useState("");
  const run = useMutation({
    mutationFn: () =>
      AgentRuntimeService.run(
        agentId,
        context.trim() ? `Context:\n${context}\n\nRequest:\n${input}` : input,
      ),
    onSuccess: async (result) => {
      setOutput(result.output);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["workspace", "agent-runs", agentId] }),
        client.invalidateQueries({ queryKey: ["workspace", "agent-schedule", agentId] }),
        client.invalidateQueries({ queryKey: ["workspace", "agent-pending-plans", agentId] }),
      ]);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const approve = useMutation({
    mutationFn: (plan: PendingAgentPlan) =>
      AgentRuntimeService.review({
        runId: plan.runId,
        planFingerprint: plan.planFingerprint,
        decision: "approve",
        approvedStepIds: plan.plan.steps
          .map((step) => step.id)
          .filter((id) => !plan.appliedStepIds.includes(id)),
      }),
    onSuccess: async () => {
      toast.success("Plano aprovado e aplicado pelo KIVRYN");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["workspace"] }),
        client.invalidateQueries({ queryKey: ["workspace", "agent-runs", agentId] }),
        client.invalidateQueries({ queryKey: ["workspace", "agent-pending-plans", agentId] }),
        client.invalidateQueries({ queryKey: ["workspace", "agent-action-audit", agentId] }),
      ]);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: (plan: PendingAgentPlan) =>
      AgentRuntimeService.review({
        runId: plan.runId,
        planFingerprint: plan.planFingerprint,
        decision: "reject",
      }),
    onSuccess: async () => {
      toast.success("Plano rejeitado. Nenhuma nova ação será aplicada.");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["workspace", "agent-runs", agentId] }),
        client.invalidateQueries({ queryKey: ["workspace", "agent-pending-plans", agentId] }),
        client.invalidateQueries({ queryKey: ["workspace", "agent-action-audit", agentId] }),
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
      <Tabs key={tab ?? "overview"} defaultValue={tab ?? "overview"} className="mt-6">
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
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
              {a.instructions || "Não informado"}
            </p>
            <p className="mt-4 text-sm">Skills: {a.capabilities.join(", ") || "nenhuma"}</p>
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
                <span className="text-muted-foreground">Aprovações pendentes</span>
                <p className="mt-1 font-medium">{pendingPlans.data?.length ?? 0}</p>
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
            <Textarea
              className="min-h-32"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Descreva o trabalho para o agente…"
            />
            <Label>Contexto (opcional)</Label>
            <Textarea
              className="min-h-20"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Restrições, audiência ou material de origem…"
            />
            <Button
              disabled={
                !input.trim() ||
                run.isPending ||
                entitlementLoading ||
                entitlementError ||
                !premium
              }
              onClick={() => run.mutate()}
            >
              <Play /> {run.isPending ? "Executando…" : "Executar"}
            </Button>
            {entitlementLoading ? (
              <p className="text-sm text-muted-foreground">Verificando acesso Premium…</p>
            ) : entitlementError ? (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-destructive">
                  Não foi possível verificar seu acesso Premium.
                </p>
                <Button size="sm" variant="outline" onClick={() => void sub.refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : !premium ? (
              <p className="text-sm text-destructive">Uma assinatura Premium ativa é necessária.</p>
            ) : null}
            {run.isError && (
              <p role="alert" className="text-sm text-destructive">
                A execução falhou. Seu texto foi preservado para nova tentativa.
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
                        toast.success("Copiado");
                      } catch {
                        toast.error("Não foi possível copiar o resultado.");
                      }
                    }}
                  >
                    <Copy /> Copiar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => run.mutate()}>
                    <RefreshCw /> Executar novamente
                  </Button>
                </div>
                <div className="whitespace-pre-wrap">{output}</div>
              </div>
            )}
            {pendingPlans.data?.map((plan) => (
              <PlanApprovalCard
                key={plan.runId}
                plan={plan}
                approving={approve.isPending}
                rejecting={reject.isPending}
                onApprove={() => approve.mutate(plan)}
                onReject={() => reject.mutate(plan)}
              />
            ))}
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
              premium={premium}
              entitlementLoading={entitlementLoading}
              entitlementError={entitlementError}
              onRetryEntitlement={() => void sub.refetch()}
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
          <div className="mt-4 space-y-4">
            <section className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Trilha de ações</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Registro somente leitura das decisões e execuções do Agent.
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 shrink-0 text-intelligence" />
              </div>
              <div className="mt-4 space-y-2">
                {actionAudit.isLoading && (
                  <p className="text-sm text-muted-foreground">Carregando trilha…</p>
                )}
                {actionAudit.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    Não foi possível carregar a trilha de ações.
                  </p>
                )}
                {actionAudit.data?.map((event) => (
                  <div key={event.id} className="rounded-xl border bg-background/50 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{event.actionType.replaceAll("_", " ")}</span>
                      <span className="text-xs font-medium">
                        {actionAuditStatusLabel(event.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.domain} · {new Date(event.occurredAt).toLocaleString("pt-BR")}
                    </p>
                    {(event.idempotent === true || event.errorCode) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.idempotent === true ? "Retry seguro (idempotente)" : ""}
                        {event.idempotent === true && event.errorCode ? " · " : ""}
                        {event.errorCode ? `Código: ${event.errorCode}` : ""}
                      </p>
                    )}
                  </div>
                ))}
                {!actionAudit.isLoading && !actionAudit.data?.length && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma ação do Agent auditada ainda.
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="px-1 text-sm font-semibold">Execuções do Agent</h2>
              {runs.data?.map((r) => {
                const detailed = r as typeof r & {
                  trigger?: string;
                  scheduled_for?: string | null;
                  action_plan_status?: string;
                  connector_ids?: string[];
                  subagent_ids?: string[];
                };
                return (
                  <details key={r.id} className="glass rounded-xl p-4">
                    <summary className="min-h-11 cursor-pointer py-2">
                      <span className="font-medium">{r.status}</span> ·{" "}
                      {detailed.trigger === "scheduled" ? "Programado" : "Manual"} ·{" "}
                      {new Date(r.created_at || r.started_at || "").toLocaleString("pt-BR")}
                    </summary>
                    {detailed.scheduled_for && (
                      <p className="text-xs text-muted-foreground">
                        Previsto para {new Date(detailed.scheduled_for).toLocaleString("pt-BR")}
                      </p>
                    )}
                    {detailed.action_plan_status && detailed.action_plan_status !== "none" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Plano de ações: {detailed.action_plan_status}
                      </p>
                    )}
                    {!!detailed.subagent_ids?.length && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Subagents: {detailed.subagent_ids.join(", ")}
                      </p>
                    )}
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {typeof r.input === "string" ? r.input : "Entrada salva"}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm">
                      {typeof r.output === "string"
                        ? r.output
                        : r.error_code || "Execução em andamento"}
                    </p>
                  </details>
                );
              })}
              {!runs.data?.length && (
                <p className="text-muted-foreground">Nenhuma execução ainda.</p>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Settings
            agent={a}
            premium={premium}
            entitlementLoading={entitlementLoading}
            entitlementError={entitlementError}
            onRetryEntitlement={() => void sub.refetch()}
            onSaved={async () => {
              await Promise.all([
                client.invalidateQueries({ queryKey: ["workspace", "agents"] }),
                client.invalidateQueries({ queryKey: ["workspace", "agents", agentId] }),
              ]);
            }}
            onDelete={async () => {
              try {
                await AgentService.remove(a.id);
                await client.invalidateQueries({ queryKey: ["workspace", "agents"] });
                await nav({ to: "/agents" });
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Não foi possível excluir o agente.");
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function actionAuditStatusLabel(status: AgentActionAuditStatus) {
  switch (status) {
    case "approval_required":
      return "Aguardando aprovação";
    case "approved":
      return "Aprovada";
    case "applied":
      return "Aplicada";
    case "rejected":
      return "Rejeitada";
    case "failed":
      return "Falhou";
  }
}

function PlanApprovalCard({
  plan,
  approving,
  rejecting,
  onApprove,
  onReject,
}: {
  plan: PendingAgentPlan;
  approving: boolean;
  rejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const remaining = plan.plan.steps.filter((step) => !plan.appliedStepIds.includes(step.id));
  return (
    <div className="rounded-2xl border border-intelligence/40 bg-intelligence/5 p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-5 w-5 text-intelligence" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Plano proposto — aguardando sua aprovação</h2>
          <p className="mt-1 text-sm text-muted-foreground">{plan.plan.intent}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Nenhuma ação abaixo é executada pelo modelo. O KIVRYN valida o plano novamente antes de aplicar.
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {plan.plan.steps.map((step, index) => {
          const applied = plan.appliedStepIds.includes(step.id);
          return (
            <div key={step.id} className="rounded-xl border bg-background/60 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">
                  {index + 1}. {step.action.replaceAll("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {applied ? "Aplicada" : step.domain}
                </span>
              </div>
              <p className="mt-1 break-words text-xs text-muted-foreground">
                {Object.entries(step.input)
                  .map(([key, value]) => `${key}: ${String(value)}`)
                  .join(" · ") || "Sem parâmetros adicionais"}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={!remaining.length || approving || rejecting} onClick={onApprove}>
          {approving ? "Aplicando…" : "Aprovar ações restantes"}
        </Button>
        <Button variant="outline" disabled={approving || rejecting} onClick={onReject}>
          {rejecting ? "Rejeitando…" : "Rejeitar plano"}
        </Button>
      </div>
    </div>
  );
}

const WEEKDAYS = [
  [1, "Seg"],
  [2, "Ter"],
  [3, "Qua"],
  [4, "Qui"],
  [5, "Sex"],
  [6, "Sáb"],
  [7, "Dom"],
] as const;

function ScheduleEditor({
  agentId,
  agentGoal,
  schedule,
  premium,
  entitlementLoading,
  entitlementError,
  onRetryEntitlement,
  onChanged,
}: {
  agentId: string;
  agentGoal: string;
  schedule: AgentSchedule | null | undefined;
  premium: boolean;
  entitlementLoading: boolean;
  entitlementError: boolean;
  onRetryEntitlement: () => void;
  onChanged: () => Promise<void>;
}) {
  const [frequency, setFrequency] = useState<"daily" | "weekly">(schedule?.frequency ?? "daily");
  const [localTime, setLocalTime] = useState(schedule?.localTime ?? "08:00");
  const [weekdays, setWeekdays] = useState<number[]>(
    schedule?.weekdays.length ? schedule.weekdays : [1],
  );
  const [timezone, setTimezone] = useState(
    schedule?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
  );
  const [prompt, setPrompt] = useState(schedule?.prompt ?? agentGoal);
  const [notify, setNotify] = useState(schedule?.notifyOnRun ?? true);
  const save = useMutation({
    mutationFn: () =>
      AgentScheduleService.configure({
        agentId,
        frequency,
        localTime,
        weekdays,
        timezone,
        prompt,
        notifyOnRun: notify,
      }),
    onSuccess: async () => {
      await onChanged();
      toast.success("Agendamento salvo");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const clear = useMutation({
    mutationFn: () => AgentScheduleService.clear(agentId),
    onSuccess: async () => {
      await onChanged();
      toast.success("Agendamento removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mt-4 max-w-2xl space-y-4">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-1 h-5 w-5 text-intelligence" />
          <div>
            <h2 className="font-semibold">Briefing programado</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Executa este Agent no servidor mesmo com o app fechado. Ele usa apenas o contexto, skills,
              connectors e subagents autorizados pelo KIVRYN. Se sugerir alterações no workspace, o plano
              fica pendente para sua aprovação — agendamento nunca significa autorização para alterar dados.
            </p>
          </div>
        </div>
      </div>
      {entitlementLoading ? (
        <p className="rounded-xl border p-3 text-sm text-muted-foreground">
          Verificando acesso Premium…
        </p>
      ) : entitlementError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 p-3">
          <p className="text-sm text-destructive">Não foi possível verificar seu acesso Premium.</p>
          <Button size="sm" variant="outline" onClick={onRetryEntitlement}>
            Tentar novamente
          </Button>
        </div>
      ) : !premium ? (
        <p className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">
          Agendamentos de Agents exigem Premium ativo.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2">
          <Label>Frequência</Label>
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as "daily" | "weekly")}
          >
            <option value="daily">Todos os dias</option>
            <option value="weekly">Semanal</option>
          </select>
        </label>
        <label className="space-y-2">
          <Label>Horário local</Label>
          <Input type="time" value={localTime} onChange={(e) => setLocalTime(e.target.value)} />
        </label>
      </div>
      {frequency === "weekly" && (
        <div>
          <Label>Dias</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEKDAYS.map(([day, label]) => (
              <Button
                key={day}
                type="button"
                size="sm"
                variant={weekdays.includes(day) ? "default" : "outline"}
                onClick={() =>
                  setWeekdays((current) =>
                    current.includes(day)
                      ? current.filter((value) => value !== day)
                      : [...current, day],
                  )
                }
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}
      <label className="space-y-2">
        <Label>Fuso horário</Label>
        <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/Bahia" />
      </label>
      <label className="space-y-2">
        <Label>O que o Agent deve executar</Label>
        <Textarea
          className="min-h-28"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex.: Prepare meu briefing semanal de conteúdo com base nas instruções deste Agent."
        />
      </label>
      <label className="flex items-center justify-between rounded-xl border p-3">
        <span>
          <span className="block font-medium">Notificar ao concluir</span>
          <span className="text-xs text-muted-foreground">
            Cria notificação no KIVRYN e envia push fora do horário silencioso.
          </span>
        </span>
        <Switch checked={notify} onCheckedChange={setNotify} />
      </label>
      {schedule?.nextRunAt && (
        <div className="rounded-xl border p-3 text-sm">
          <p>
            <span className="text-muted-foreground">Próxima:</span>{" "}
            {new Date(schedule.nextRunAt).toLocaleString("pt-BR")}
          </p>
          {schedule.lastRunAt && (
            <p className="mt-1">
              <span className="text-muted-foreground">Última:</span>{" "}
              {new Date(schedule.lastRunAt).toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!premium || save.isPending || !prompt.trim()}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Salvando…" : schedule?.frequency ? "Atualizar agendamento" : "Ativar agendamento"}
        </Button>
        {schedule?.frequency && (
          <Button variant="outline" disabled={clear.isPending} onClick={() => clear.mutate()}>
            Desativar
          </Button>
        )}
      </div>
    </div>
  );
}

function scheduleLabel(schedule: AgentSchedule) {
  if (!schedule.frequency) return "Manual";
  if (schedule.frequency === "daily") return `Diário · ${schedule.localTime ?? "—"}`;
  const labels = schedule.weekdays
    .map((day) => WEEKDAYS.find(([value]) => value === day)?.[1])
    .filter(Boolean)
    .join(", ");
  return `${labels || "Semanal"} · ${schedule.localTime ?? "—"}`;
}

function Settings({
  agent,
  premium,
  entitlementLoading,
  entitlementError,
  onRetryEntitlement,
  onSaved,
  onDelete,
}: {
  agent: Awaited<ReturnType<typeof AgentService.listRows>>[number];
  premium: boolean;
  entitlementLoading: boolean;
  entitlementError: boolean;
  onRetryEntitlement: () => void;
  onSaved: () => Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const [name, setName] = useState(agent.name ?? "");
  const [description, setDescription] = useState(agent.description ?? "");
  const [goal, setGoal] = useState(agent.goal ?? "");
  const [instructions, setInstructions] = useState(agent.instructions ?? "");
  const [active, setActive] = useState(!!agent.active);
  const save = useMutation({
    mutationFn: () => AgentService.update(agent.id, { name, description, goal, instructions, active }),
    onSuccess: async () => {
      await onSaved();
      toast.success("Agente atualizado");
    },
    onError: (error: Error) =>
      toast.error(
        error.message.includes("premium_required")
          ? "Premium ativo é necessário para ativar este Agent."
          : error.message,
      ),
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
        <Switch
          checked={active}
          onCheckedChange={setActive}
          disabled={!active && (entitlementLoading || entitlementError || !premium)}
        />
      </label>
      {!agent.active && entitlementLoading ? (
        <p className="text-sm text-muted-foreground">Verificando acesso Premium…</p>
      ) : !agent.active && entitlementError ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-destructive">Não foi possível verificar seu acesso Premium.</p>
          <Button size="sm" variant="outline" onClick={onRetryEntitlement}>
            Tentar novamente
          </Button>
        </div>
      ) : !agent.active && !premium ? (
        <p className="text-sm text-destructive">Premium ativo é necessário para reativar este Agent.</p>
      ) : null}
      <div className="flex gap-2">
        <Button disabled={save.isPending || !name.trim()} onClick={() => save.mutate()}>
          {save.isPending ? "Salvando…" : "Salvar"}
        </Button>
        <Button variant="destructive" onClick={() => confirm("Excluir agente?") && void onDelete()}>
          <Trash2 /> Excluir
        </Button>
      </div>
    </div>
  );
}
