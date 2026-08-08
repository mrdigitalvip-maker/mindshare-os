import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Clock3,
  Pencil,
  Plus,
  RefreshCw,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudyService, workspaceQueryKeys } from "@/services";
export const Route = createFileRoute("/_shell/studies/$subjectId")({ component: Workspace });
const ops = ["explain", "summarize", "questions", "flashcards", "study_plan"] as const;
const labels = {
  explain: "Explicar",
  summarize: "Resumir",
  questions: "Perguntas",
  flashcards: "Flashcards",
  study_plan: "Plano de estudo",
};
function Workspace() {
  const { subjectId } = Route.useParams();
  const nav = useNavigate();
  const client = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const base = workspaceQueryKeys.studies(user?.id);
  const subject = useQuery({
    queryKey: [...base, subjectId],
    queryFn: () => StudyService.getSubject(subjectId),
    enabled: isAuthenticated && !!user && !!subjectId.trim(),
    retry: 2,
  });
  const sessions = useQuery({
    queryKey: [...base, subjectId, "sessions"],
    queryFn: () => StudyService.listSubjectSessions(subjectId),
    enabled: !!subject.data,
    retry: 2,
  });
  const goals = useQuery({
    queryKey: [...base, subjectId, "goals"],
    queryFn: () => StudyService.listGoals(subjectId),
    enabled: !!subject.data,
    retry: 1,
  });
  const notes = useQuery({
    queryKey: [...base, subjectId, "notes"],
    queryFn: () => StudyService.listNotes(subjectId),
    enabled: !!subject.data,
    retry: 1,
  });
  useEffect(() => {
    const errors = [
      ["subject", subject.error],
      ["sessions", sessions.error],
      ["goals", goals.error],
      ["notes", notes.error],
    ] as const;
    for (const [query, error] of errors) {
      if (error) console.error("[Studies workspace] Query failed", { query, subjectId, error });
    }
  }, [subjectId, subject.error, sessions.error, goals.error, notes.error]);
  const queryErrors = [
    ["subject", subject.error] as const,
    ["sessions", sessions.error] as const,
    ["goals", goals.error] as const,
    ["notes", notes.error] as const,
  ].filter(([, error]) => error != null);
  const [minutes, setMinutes] = useState("30"),
    [activity, setActivity] = useState(""),
    [topic, setTopic] = useState(""),
    [context, setContext] = useState(""),
    [result, setResult] = useState("");
  const [goalTitle, setGoalTitle] = useState(""),
    [goalTarget, setGoalTarget] = useState("5"),
    [goalDue, setGoalDue] = useState("");
  const [noteTitle, setNoteTitle] = useState(""),
    [noteContent, setNoteContent] = useState("");
  const refresh = () => client.invalidateQueries({ queryKey: base });
  const record = useMutation({
    mutationFn: () =>
      StudyService.recordSession({
        subject_id: subjectId,
        duration: Number(minutes),
        completed: true,
        activity: activity.trim(),
      }),
    onSuccess: async () => {
      await refresh();
      setActivity("");
      toast.success("Sessão registrada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const addGoal = useMutation({
    mutationFn: () =>
      StudyService.createGoal({
        subject_id: subjectId,
        title: goalTitle.trim(),
        target_value: Number(goalTarget),
        due_at: goalDue || undefined,
      }),
    onSuccess: async () => {
      await refresh();
      setGoalTitle("");
      toast.success("Meta criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const addNote = useMutation({
    mutationFn: () =>
      StudyService.saveNote({
        subject_id: subjectId,
        title: noteTitle.trim() || "Nota",
        content: noteContent,
      }),
    onSuccess: async () => {
      await refresh();
      setNoteTitle("");
      setNoteContent("");
      toast.success("Nota salva");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const ai = useMutation({
    mutationFn: (operation: (typeof ops)[number]) =>
      StudyService.assist({ operation, text: [topic, context].filter(Boolean).join("\n\n") }),
    onSuccess: (r) => setResult(r.content),
    onError: (e: Error) => toast.error(`A IA não respondeu: ${e.message}`),
  });
  if (subject.isPending)
    return (
      <PageShell>
        <div
          className="mt-10 h-56 animate-pulse rounded-3xl bg-muted/30"
          aria-label="Carregando matéria"
        />
      </PageShell>
    );
  if (subject.isError)
    return (
      <PageShell>
        <LocalError
          title="Não foi possível abrir esta matéria"
          detail="A consulta da matéria falhou. Seus dados não foram alterados."
          retry={() => subject.refetch()}
          navigateBack={() => nav({ to: "/studies" })}
        />
      </PageShell>
    );
  if (!subject.data)
    return (
      <PageShell>
        <EmptyState
          icon={Trash2}
          title="Matéria não encontrada"
          description="Ela foi removida ou não pertence à sua conta."
        />
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => nav({ to: "/studies" })}>
            <ArrowLeft />
            Voltar
          </Button>
        </div>
      </PageShell>
    );
  const currentSubject = subject.data;
  const all = sessions.data ?? [],
    total = all.reduce((n, s) => n + (s.duration ?? 0), 0),
    done = all.filter((s) => s.completed).length,
    progress = all.length ? Math.round((done / all.length) * 100) : 0;
  return (
    <PageShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => nav({ to: "/studies" })}>
          <ArrowLeft />
          Estudos
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const name = prompt("Nome da matéria", currentSubject.name ?? "");
              if (name?.trim()) {
                await StudyService.updateSubject(subjectId, {
                  name: name.trim(),
                  updated_at: new Date().toISOString(),
                });
                await refresh();
              }
            }}
          >
            <Pencil />
            Editar
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (confirm("Excluir a matéria e todo o histórico?")) {
                try {
                  await StudyService.removeSubject(subjectId);
                  nav({ to: "/studies" });
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }
            }}
          >
            <Trash2 />
            <span className="sr-only sm:not-sr-only">Excluir</span>
          </Button>
        </div>
      </div>
      <section className="mt-5 overflow-hidden rounded-3xl border bg-card p-5 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">
              Workspace de aprendizagem
            </p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{currentSubject.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {currentSubject.description ||
                "Registre sessões, avance metas e transforme seu material com IA."}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric value={all.length} label="sessões" />
            <Metric value={`${total}m`} label="estudados" />
            <Metric value={`${progress}%`} label="conclusão" />
          </div>
        </div>
      </section>
      {(sessions.isError || goals.isError || notes.isError) && (
        <div className="mt-4">
          <LocalError
            title="Parte do workspace não pôde ser carregada"
            detail={`A consulta de ${queryErrors.map(([name]) => name).join(", ")} falhou.`}
            retry={() => refresh()}
            navigateBack={() => nav({ to: "/studies" })}
          />
        </div>
      )}
      <Tabs defaultValue="overview" className="mt-6 min-w-0">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Hoje</TabsTrigger>
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
          <TabsTrigger value="ai">IA</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel title="Próximo passo" icon={<Clock3 />}>
              <p className="text-sm text-muted-foreground">
                Registre uma sessão focada. Seu progresso é calculado somente com sessões salvas.
              </p>
              <Button
                className="mt-4"
                onClick={() =>
                  document.querySelector<HTMLButtonElement>("[data-value=sessions]")?.click()
                }
              >
                Iniciar registro
              </Button>
            </Panel>
            <Panel title="Metas ativas" icon={<Target />}>
              {(goals.data ?? [])
                .filter((g) => !g.completed)
                .slice(0, 3)
                .map((g) => (
                  <Goal key={g.id} goal={g} refresh={refresh} />
                ))}
              {!goals.data?.some((g) => !g.completed) && (
                <p className="text-sm text-muted-foreground">Nenhuma meta ativa.</p>
              )}
            </Panel>
          </div>
        </TabsContent>
        <TabsContent value="sessions">
          <Panel title="Registrar sessão" icon={<Clock3 />}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Duração (min)
                <Input
                  type="number"
                  min="1"
                  max="1440"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
              </label>
              <label className="text-sm">
                Atividade
                <Input
                  maxLength={240}
                  placeholder="Ex.: revisão do capítulo 3"
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                />
              </label>
            </div>
            <Button
              className="mt-4"
              disabled={Number(minutes) < 1 || record.isPending}
              onClick={() => record.mutate()}
            >
              {record.isPending ? "Salvando…" : "Concluir sessão"}
            </Button>
          </Panel>
        </TabsContent>
        <TabsContent value="goals">
          <Panel title="Metas de aprendizagem" icon={<Target />}>
            <div className="grid gap-3 sm:grid-cols-[1fr_100px_160px_auto]">
              <Input
                placeholder="Nova meta"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
              />
              <Input
                aria-label="Alvo"
                type="number"
                min="1"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
              />
              <Input
                aria-label="Prazo"
                type="date"
                value={goalDue}
                onChange={(e) => setGoalDue(e.target.value)}
              />
              <Button
                disabled={!goalTitle.trim() || addGoal.isPending}
                onClick={() => addGoal.mutate()}
              >
                <Plus />
                Criar
              </Button>
            </div>
            <div className="mt-5 space-y-2">
              {goals.data?.map((g) => (
                <Goal key={g.id} goal={g} refresh={refresh} />
              ))}
              {!goals.data?.length && (
                <p className="text-sm text-muted-foreground">
                  Defina a primeira meta para orientar sua continuidade.
                </p>
              )}
            </div>
          </Panel>
        </TabsContent>
        <TabsContent value="notes">
          <Panel title="Notas da matéria" icon={<Pencil />}>
            <div className="space-y-3">
              <Input
                placeholder="Título"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
              />
              <Textarea
                placeholder="Registre conceitos, dúvidas e conclusões…"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
              <Button
                disabled={!noteContent.trim() || addNote.isPending}
                onClick={() => addNote.mutate()}
              >
                Salvar nota
              </Button>
            </div>
            <div className="mt-5 space-y-3">
              {notes.data?.map((n) => (
                <article key={n.id} className="rounded-xl border p-4">
                  <div className="flex justify-between gap-3">
                    <h3 className="font-medium">{n.title}</h3>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Excluir nota"
                      onClick={async () => {
                        if (confirm("Excluir nota?")) {
                          await StudyService.removeNote(n.id);
                          await refresh();
                        }
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {n.content}
                  </p>
                </article>
              ))}
            </div>
          </Panel>
        </TabsContent>
        <TabsContent value="ai">
          <Panel title="Tutor de IA" icon={<Brain />}>
            <Input placeholder="Tópico" value={topic} onChange={(e) => setTopic(e.target.value)} />
            <Textarea
              className="mt-3"
              placeholder="Contexto opcional"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {ops.map((op) => (
                <Button
                  className="shrink-0"
                  variant="outline"
                  key={op}
                  disabled={!topic.trim() || ai.isPending}
                  onClick={() => ai.mutate(op)}
                >
                  {labels[op]}
                </Button>
              ))}
            </div>
            {ai.isPending && (
              <p className="mt-4 animate-pulse text-sm text-muted-foreground">
                Preparando resposta…
              </p>
            )}
            {result && (
              <div className="mt-4 whitespace-pre-wrap rounded-xl border bg-background p-4 text-sm leading-6">
                {result}
              </div>
            )}
          </Panel>
        </TabsContent>
        <TabsContent value="history">
          <div className="mt-4 space-y-2">
            {all.map((s) => (
              <div className="flex items-center gap-3 rounded-xl border bg-card p-4" key={s.id}>
                <CheckCircle2
                  className={s.completed ? "text-emerald-400" : "text-muted-foreground"}
                />
                <div className="min-w-0">
                  <p className="font-medium">{s.activity || "Sessão de estudo"}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.duration} min · {new Date(s.created_at ?? "").toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
            {!all.length && (
              <EmptyState
                icon={Clock3}
                title="Sem sessões"
                description="Seu histórico aparecerá após a primeira sessão."
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-muted/40 p-3">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center gap-2 [&_svg]:h-4 [&_svg]:w-4">
        <span className="text-violet-300">{icon}</span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
function LocalError({
  title,
  detail,
  retry,
  navigateBack,
}: {
  title: string;
  detail: string;
  retry: () => unknown;
  navigateBack: () => unknown;
}) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5" role="alert">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={retry}>
          <RefreshCw />
          Tentar novamente
        </Button>
        <Button variant="ghost" onClick={navigateBack}>
          <ArrowLeft />
          Voltar para Estudos
        </Button>
      </div>
    </div>
  );
}
function Goal({
  goal,
  refresh,
}: {
  goal: Awaited<ReturnType<typeof StudyService.listGoals>>[number];
  refresh: () => Promise<unknown>;
}) {
  const currentValue = Number.isFinite(goal.current_value) ? Math.max(0, goal.current_value) : 0;
  const targetValue = Number.isFinite(goal.target_value) ? Math.max(1, goal.target_value) : 1;
  const pct = Math.min(100, Math.round((currentValue / targetValue) * 100));
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p
            className={
              goal.completed
                ? "truncate line-through text-muted-foreground"
                : "truncate font-medium"
            }
          >
            {goal.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {goal.current_value}/{goal.target_value}
            {goal.due_at
              ? ` · até ${new Date(`${goal.due_at}T12:00:00`).toLocaleDateString("pt-BR")}`
              : ""}
          </p>
        </div>
        <div className="flex">
          <Button
            size="icon"
            variant="ghost"
            aria-label={goal.completed ? "Reabrir meta" : "Concluir meta"}
            onClick={async () => {
              await StudyService.updateGoal(goal.id, {
                completed: !goal.completed,
                current_value: goal.completed ? goal.current_value : goal.target_value,
                updated_at: new Date().toISOString(),
              });
              await refresh();
            }}
          >
            <CheckCircle2 />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Excluir meta"
            onClick={async () => {
              if (confirm("Excluir meta?")) {
                await StudyService.removeGoal(goal.id);
                await refresh();
              }
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-violet-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
