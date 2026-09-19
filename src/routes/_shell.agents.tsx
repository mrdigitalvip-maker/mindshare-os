import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
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
import { ActionHistoryPanel } from "@/components/action-history-panel";
import {
  AgentService,
  BackgroundRunService,
  WEB_AGENT_EXTERNAL_CONNECTORS,
  WEB_AGENT_SKILLS,
  externalConnectorStatus,
  listIntegrationReadiness,
  resolveWebAgentSkills,
  workspaceQueryKeys,
} from "@/services";
import { useSubscription } from "@/hooks/use-subscription";
import { MetricCard, PremiumGate, WorkspaceShell } from "@/components/workspace-ui";
import { useLanguage } from "@/providers/language-provider";
export const Route = createFileRoute("/_shell/agents")({
  head: () => ({ meta: [{ title: "Agentes — KIVRYN" }] }),
  component: Agents,
});
const capabilities = WEB_AGENT_SKILLS.map(
  (skill) => [skill.capability, skill.name, skill.description] as const,
);
const emptyAgentForm = () => ({
  name: "",
  description: "",
  goal: "",
  instructions: "",
  tone: "Profissional",
  expected_output: "",
  capabilities: [] as string[],
  external_connector_ids: [] as string[],
});
function Agents() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname !== "/agents" && pathname !== "/agents/" ? <Outlet /> : <AgentsIndex />;
}

function AgentsIndex() {
  const { resolvedLocale } = useLanguage();
  const L = (pt: string, en: string) => (resolvedLocale === "pt-BR" ? pt : en);
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
  const backgroundRuns = useQuery({
    queryKey: ["workspace", "agent-background-runs"],
    queryFn: () => BackgroundRunService.list(),
    refetchInterval: 30_000,
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
  const activeBackground = (backgroundRuns.data ?? []).filter((run) =>
    ["queued", "running", "retry_wait"].includes(run.status),
  ).length;
  const retryingBackground = (backgroundRuns.data ?? []).filter(
    (run) => run.status === "retry_wait",
  ).length;
  const premium = subscription.data?.isPremium === true;
  const entitlementLoading = subscription.isPending && !subscription.data;
  const entitlementError = subscription.isError;
  const openBuilder = () => {
    if (entitlementLoading) return;
    if (entitlementError) {
      toast.error(L("Não foi possível verificar seu acesso Premium. Tente novamente.", "Could not verify your Premium access. Try again."));
      return;
    }
    if (premium) {
      setBuilder(true);
      return;
    }
    toast.error(L("Faça upgrade para criar e executar agentes.", "Upgrade to create and run agents."));
  };
  return (
    <PageShell>
      <WorkspaceShell>
        <PageHeader
          eyebrow={L("Recurso Premium", "Premium feature")}
          title={L("Agentes", "Agents")}
          description={L("Crie especialistas reutilizáveis com skills KIVRYN versionadas e execução segura.", "Create reusable specialists with versioned KIVRYN skills and safe execution.")}
          actions={
            <Button disabled={entitlementLoading} onClick={openBuilder}>
              <Plus />
              {L("Novo agente", "New agent")}
            </Button>
          }
        />
        {entitlementLoading ? (
          <PremiumGate>
            <p className="text-sm text-muted-foreground">{L("Verificando acesso Premium…", "Checking Premium access…")}</p>
          </PremiumGate>
        ) : entitlementError ? (
          <PremiumGate>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-destructive">
                {L("Não foi possível verificar seu acesso Premium.", "Could not verify your Premium access.")}
              </p>
              <Button size="sm" variant="outline" onClick={() => void subscription.refetch()}>
                {L("Tentar novamente", "Try again")}
              </Button>
            </div>
          </PremiumGate>
        ) : !premium ? (
          <PremiumGate>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                <Crown className="mr-2 inline h-4 w-4 text-gold" />
                {L("Agentes são exclusivos do Premium.", "Agents are a Premium feature.")}
              </p>
              <Link to="/premium">
                <Button size="sm">{L("Ver Premium", "View Premium")}</Button>
              </Link>
            </div>
          </PremiumGate>
        ) : null}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label={L("Agentes ativos", "Active agents")}
            value={(query.data ?? []).filter((a) => a.active).length}
          />
          <MetricCard label={L("Execuções recentes", "Recent runs")} value={(runs.data ?? []).length} hint={L("Execuções persistidas", "Persisted runs")} />
          <MetricCard
            label={L("Segundo plano", "Background")}
            value={activeBackground}
            hint={retryingBackground ? `${retryingBackground} ${L("aguardando nova tentativa", "waiting for retry")}` : L("Fila saudável", "Healthy queue")}
          />
          <MetricCard
            label={L("Última execução", "Last execution")}
            value={
              runs.data?.[0]
                ? new Date(runs.data[0].started_at || runs.data[0].created_at).toLocaleDateString(resolvedLocale)
                : "—"
            }
          />
        </div>
        <ActionHistoryPanel />
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            aria-label={L("Buscar agentes", "Search agents")}
            placeholder={L("Buscar por nome ou objetivo", "Search by name or purpose")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!visible.length ? (
          <EmptyState
            icon={Bot}
            title={search ? L("Nenhum agente corresponde à busca", "No agents match your search") : L("Crie um especialista de IA reutilizável", "Build a reusable AI specialist")}
            description={
              search
                ? L("Tente outro nome ou objetivo.", "Try a different name or purpose.")
                : L("Defina um objetivo e selecione skills KIVRYN. As skills moldam como o Agent trabalha sem conceder alterações silenciosas no workspace.", "Define a purpose and select KIVRYN skills. Skills shape how the Agent works without granting silent workspace mutations.")
            }
            action={
              !search && (
                <Button disabled={entitlementLoading} onClick={openBuilder}>
                  <Plus />
                  {L("Criar primeiro agente", "Create your first agent")}
                </Button>
              )
            }
          />
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((a) => {
              const recent = lastRun(a.id);
              const skills = resolveWebAgentSkills(a.capabilities);
              return (
                <article key={a.id} className="glass min-w-0 rounded-2xl p-6">
                  <Bot className="text-gold" />
                  <h2 className="mt-3 font-display text-xl">{a.name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {a.goal || a.description}
                  </p>
                  {!!skills.length && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <span key={skill.id} className="rounded-full border px-2 py-1 text-xs">
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="mt-4 inline-flex rounded-full border px-2 py-1 text-xs">
                    {a.active ? L("Ativo", "Active") : L("Inativo", "Inactive")}
                  </span>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {L("Última execução", "Last run")}:{" "}
                    {recent
                      ? new Date(recent.started_at || recent.created_at).toLocaleString(resolvedLocale)
                      : L("Nunca", "Never")}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Link
                      to="/agents/$agentId"
                      params={{ agentId: a.id }}
                      search={{ tab: undefined }}
                    >
                      <Button variant="outline">{L("Abrir", "Open")}</Button>
                    </Link>
                    <Link
                      to="/agents/$agentId"
                      params={{ agentId: a.id }}
                      search={{ tab: "run" }}
                    >
                      <Button disabled={!a.active}>
                        <Play />
                        {L("Executar", "Run")}
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
  const { resolvedLocale } = useLanguage();
  const L = (pt: string, en: string) => (resolvedLocale === "pt-BR" ? pt : en);
  const client = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyAgentForm);
  const integrationReadiness = useQuery({
    queryKey: ["integrations", "readiness", "agent-builder"],
    queryFn: listIntegrationReadiness,
    enabled: open && form.capabilities.includes("integrations"),
    staleTime: 30_000,
  });
  const resetAndClose = () => {
    setStep(1);
    setForm(emptyAgentForm());
    close();
  };
  const field = (k: string, v: string) => setForm((c) => ({ ...c, [k]: v }));
  const create = useMutation({
    mutationFn: () => AgentService.create({ ...form, active: true }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: workspaceQueryKeys.agents });
      toast.success(L("Agente criado", "Agent created"));
      resetAndClose();
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("premium_required") ? L("Agentes exigem Premium ativo.", "Agents require active Premium.") : e.message),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetAndClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{L("Novo agente", "New agent")} · {L("etapa", "step")} {step} {L("de", "of")} 5</DialogTitle>
        </DialogHeader>
        {step === 1 && (
          <div className="space-y-3">
            <Label>{L("Nome", "Name")}</Label>
            <Input value={form.name} onChange={(e) => field("name", e.target.value)} />
            <Label>{L("Descrição", "Description")}</Label>
            <Textarea
              value={form.description}
              onChange={(e) => field("description", e.target.value)}
            />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <Label>{L("O que este agente deve fazer?", "What should this agent do?")}</Label>
            <Textarea value={form.goal} onChange={(e) => field("goal", e.target.value)} />
            <Label>{L("Qual resultado ele deve produzir?", "What result should it produce?")}</Label>
            <Textarea
              value={form.expected_output}
              onChange={(e) => field("expected_output", e.target.value)}
            />
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <Label>{L("Instruções", "Instructions")}</Label>
            <Textarea
              value={form.instructions}
              onChange={(e) => field("instructions", e.target.value)}
            />
            <Label>{L("Tom", "Tone")}</Label>
            <Input value={form.tone} onChange={(e) => field("tone", e.target.value)} />
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3">
            <div>
              <Label>{L("Skills especializadas", "Specialized skills")}</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                {L("Cada skill adiciona um método de trabalho versionado. Autoridade para alterar o workspace continua separada e exige aprovação KIVRYN.", "Each skill adds a versioned way of working. Authority to mutate the workspace remains separate and requires KIVRYN approval.")}
              </p>
            </div>
            {capabilities.map(([value, label, description]) => (
              <label className="flex items-start gap-3 rounded-xl border p-3" key={value}>
                <Checkbox
                  checked={form.capabilities.includes(value)}
                  onCheckedChange={(checked) =>
                    setForm((c) => ({
                      ...c,
                      capabilities: checked
                        ? [...c.capabilities, value]
                        : c.capabilities.filter((x) => x !== value),
                      ...(value === "integrations" && !checked
                        ? { external_connector_ids: [] }
                        : {}),
                    }))
                  }
                />
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
                </span>
              </label>
            ))}
            {form.capabilities.includes("integrations") ? (
              <div className="space-y-2 rounded-xl border p-3">
                <div>
                  <Label>{L("Contexto externo permitido", "Allowed external context")}</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {L(
                      "Selecione quais conexões o Agent pode ler. Isso não autoriza envios ou alterações externas.",
                      "Choose which connections the Agent may read. This does not authorize sends or external mutations.",
                    )}
                  </p>
                </div>
                {WEB_AGENT_EXTERNAL_CONNECTORS.map((connector) => {
                  const status = externalConnectorStatus(connector, integrationReadiness.data);
                  const statusLabel =
                    status === "connected"
                      ? L("Conectado", "Connected")
                      : status === "configuration_required"
                        ? L("Configuração necessária", "Configuration required")
                        : L("Não conectado", "Not connected");
                  return (
                    <label className="flex items-start gap-3 rounded-lg border p-3" key={connector.id}>
                      <Checkbox
                        checked={form.external_connector_ids.includes(connector.id)}
                        onCheckedChange={(checked) =>
                          setForm((current) => ({
                            ...current,
                            external_connector_ids: checked
                              ? [...current.external_connector_ids, connector.id]
                              : current.external_connector_ids.filter((id) => id !== connector.id),
                          }))
                        }
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {connector.name} · {statusLabel}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {connector.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
                {integrationReadiness.isError ? (
                  <p className="text-xs text-destructive">
                    {L(
                      "Não foi possível verificar o estado das conexões agora.",
                      "Couldn't verify connection status right now.",
                    )}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
        {step === 5 && (
          <div className="rounded-xl border p-4">
            <h3 className="font-display text-xl">{form.name}</h3>
            <p className="mt-2 text-sm">{form.goal}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              {form.capabilities.map((v) => capabilities.find((c) => c[0] === v)?.[1]).join(" · ")}
            </p>
            {form.external_connector_ids.length ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {L("Connectors", "Connectors")}:{" "}
                {form.external_connector_ids
                  .map((id) => WEB_AGENT_EXTERNAL_CONNECTORS.find((connector) => connector.id === id)?.name ?? id)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
        )}
        <div className="mt-4 flex justify-between">
          <Button
            variant="outline"
            onClick={() => (step === 1 ? resetAndClose() : setStep(step - 1))}
          >
            {step === 1 ? L("Cancelar", "Cancel") : L("Voltar", "Back")}
          </Button>
          <Button
            disabled={(step === 1 && !form.name.trim()) || create.isPending}
            onClick={() => (step < 5 ? setStep(step + 1) : create.mutate())}
          >
            {step < 5 ? L("Continuar", "Continue") : L("Criar agente", "Create agent")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
