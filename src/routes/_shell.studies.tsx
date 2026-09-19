import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, PageShell } from "@/components/page-shell";
import { useLanguage } from "@/providers/language-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { workspaceMutationError } from "@/lib/mutation-errors";
import { StudyService, workspaceQueryKeys } from "@/services";
import { WorkspaceProgress } from "@/components/workspace-ui";

export const Route = createFileRoute("/_shell/studies")({ component: Studies });

function Studies() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname !== "/studies" && pathname !== "/studies/" ? <Outlet /> : <StudiesIndex />;
}

function StudiesIndex() {
  const { t, resolvedLocale } = useLanguage();
  const nav = useNavigate();
  const client = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const key = workspaceQueryKeys.studies(user?.id);
  const [open, setOpen] = useState(false);
  const plans = useQuery({
    queryKey: key,
    // listPlans composes other StudyService methods through `this`, so do not pass it unbound.
    queryFn: () => StudyService.listPlans(),
    enabled: isAuthenticated && !!user,
    retry: 2,
  });
  const subjects = useQuery({
    queryKey: [...key, "subjects"],
    queryFn: StudyService.listSubjects,
    enabled: isAuthenticated && !!user,
  });
  const sessions = useQuery({
    queryKey: [...key, "sessions"],
    queryFn: StudyService.listHistory,
    enabled: isAuthenticated && !!user,
  });
  const goals = useQuery({
    queryKey: [...key, "goals"],
    queryFn: () => StudyService.listGoals(),
    enabled: isAuthenticated && !!user,
  });
  const studyPlans = Array.isArray(plans.data) ? plans.data : [];
  const studySubjects = Array.isArray(subjects.data) ? subjects.data : [];
  const studySessions = Array.isArray(sessions.data) ? sessions.data : [];
  const studyGoals = Array.isArray(goals.data) ? goals.data : [];
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [rhythm, setRhythm] = useState("");
  const [color, setColor] = useState("#8b5cf6");
  const create = useMutation({
    mutationFn: async () => {
      const description = rhythm.trim()
        ? `Objetivo: ${goal.trim() || "a definir"}\nRitmo: ${rhythm.trim()}`
        : goal.trim();
      const subject = await StudyService.createSubject({
        name: name.trim(),
        color,
        description,
      });
      if (goal.trim()) {
        try {
          await StudyService.createGoal({
            subject_id: subject.id,
            title: goal.trim(),
            target_value: 1,
          });
        } catch (error) {
          return { subject, goalError: (error as Error).message };
        }
      }
      return { subject };
    },
    onSuccess: async ({ subject, goalError }) => {
      await client.invalidateQueries({ queryKey: key });
      setOpen(false);
      setName("");
      setGoal("");
      setRhythm("");
      if (goalError) {
        toast.warning("Matéria criada, mas a meta inicial não foi salva", {
          description: `${goalError} Você pode tentar novamente no workspace.`,
        });
      } else {
        toast.success("Matéria criada e salva");
      }
      nav({ to: "/studies/$subjectId", params: { subjectId: subject.id } });
    },
    onError: (error: unknown) => {
      const mapped = workspaceMutationError(error);
      toast.error(mapped.message);
    },
  });

  useEffect(() => {
    const errors = [
      ["subjects and sessions", plans.error],
      ["subjects", subjects.error],
      ["sessions", sessions.error],
      ["goals", goals.error],
    ] as const;
    for (const [query, error] of errors) {
      if (error) console.error("[Studies] Query failed", { query, error });
    }
  }, [plans.error, subjects.error, sessions.error, goals.error]);

  const failedQueries = [
    ["subjects and sessions", plans] as const,
    ["subjects", subjects] as const,
    ["sessions", sessions] as const,
    ["goals", goals] as const,
  ].filter(([, query]) => query.isError);

  const retryFailedQueries = async () => {
    await Promise.all(failedQueries.map(([, query]) => query.refetch()));
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow={resolvedLocale === "pt-BR" ? "Espaço de aprendizagem" : "Learning workspace"}
        title={t("page.studies.title")}
        description={t("page.studies.description")}
        actions={
          <Button className="min-h-11" onClick={() => setOpen(true)}>
            <Plus />
            {resolvedLocale === "pt-BR" ? "Nova matéria" : "New subject"}
          </Button>
        }
      />
      {!plans.isPending && !plans.isError && studyPlans.length > 0 && (
        <section
          className="v2-surface relative mt-8 overflow-hidden rounded-3xl p-6 sm:p-8"
          aria-labelledby="learning-overview-title"
        >
          <div
            className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-violet-500/10 to-transparent sm:block"
            aria-hidden="true"
          />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/12 text-intelligence">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[.22em] text-intelligence">
                {resolvedLocale === "pt-BR" ? "Pulso de aprendizagem" : "Learning pulse"}
              </p>
              <h2
                id="learning-overview-title"
                className="mt-2 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                {resolvedLocale === "pt-BR" ? "Continue construindo conhecimento duradouro." : "Continue building durable knowledge."}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {resolvedLocale === "pt-BR" ? "Todas as métricas abaixo são calculadas a partir das suas matérias persistidas e sessões concluídas." : "Every metric below is calculated from your persisted subjects and completed sessions."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-32 rounded-2xl border bg-background/70 p-4">
                <p className="text-2xl font-semibold tabular-nums">{studyPlans.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">{resolvedLocale === "pt-BR" ? "Matérias ativas" : "Active subjects"}</p>
              </div>
              <div className="min-w-32 rounded-2xl border bg-background/70 p-4">
                <p className="text-2xl font-semibold tabular-nums">
                  {Math.round(
                    studyPlans.reduce((total, plan) => total + plan.progress, 0) /
                      studyPlans.length,
                  )}
                  %
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{resolvedLocale === "pt-BR" ? "Conclusão média" : "Avg. completion"}</p>
              </div>
            </div>
          </div>
        </section>
      )}
      {!plans.isPending && !plans.isError && studyPlans.length > 0 && (
        <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
          <section className="v2-surface rounded-2xl p-5" aria-labelledby="study-today">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-intelligence">
                  {resolvedLocale === "pt-BR" ? "Hoje" : "Today"}
                </p>
                <h2 id="study-today" className="mt-1 text-xl font-semibold">
                  {resolvedLocale === "pt-BR" ? "Seu próximo passo de aprendizagem" : "Your next learning move"}
                </h2>
              </div>
              <Button
                onClick={() =>
                  nav({
                    to: "/studies/$subjectId",
                    params: { subjectId: studySubjects[0]?.id ?? studyPlans[0]?.id ?? "" },
                  })
                }
              >
                {resolvedLocale === "pt-BR" ? "Começar a estudar" : "Start studying"}
              </Button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {studyGoals
                .filter((goal) => !goal.completed)
                .slice(0, 3)
                .map((goal) => (
                  <button
                    key={goal.id}
                    className="min-h-20 rounded-xl border p-4 text-left hover:border-violet-400/50"
                    onClick={() =>
                      goal.subject_id &&
                      nav({ to: "/studies/$subjectId", params: { subjectId: goal.subject_id } })
                    }
                  >
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Target className="h-3.5 w-3.5" /> {resolvedLocale === "pt-BR" ? "Abrir meta" : "Open goal"}
                    </span>
                    <strong className="mt-2 block truncate text-sm">{goal.title}</strong>
                  </button>
                ))}
              {!studyGoals.some((goal) => !goal.completed) && (
                <p className="text-sm text-muted-foreground">
                  {resolvedLocale === "pt-BR" ? "Nenhuma meta aberta. Continue sua matéria mais recente ou crie uma meta no espaço dela." : "No open goals. Continue your most recent subject or create a goal in its workspace."}
                </p>
              )}
            </div>
          </section>
          <section className="v2-surface rounded-2xl p-5" aria-labelledby="study-progress">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-muted-foreground">
              {resolvedLocale === "pt-BR" ? "Progresso" : "Progress"}
            </p>
            <h2 id="study-progress" className="mt-1 text-xl font-semibold">
              {resolvedLocale === "pt-BR" ? "Atividade real" : "Real activity"}
            </h2>
            <dl className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">{resolvedLocale === "pt-BR" ? "Sessões" : "Sessions"}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{studySessions.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{resolvedLocale === "pt-BR" ? "Minutos" : "Minutes"}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  {studySessions.reduce((sum, item) => sum + (item.duration ?? 0), 0)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{resolvedLocale === "pt-BR" ? "Metas" : "Goals"}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{studyGoals.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{resolvedLocale === "pt-BR" ? "Concluídas" : "Completed"}</dt>
                <dd className="mt-1 flex items-center gap-1 text-2xl font-semibold tabular-nums">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  {studyGoals.filter((item) => item.completed).length}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      )}
      {failedQueries.length > 0 ? (
        <div
          className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-6"
          role="alert"
        >
          <h2 className="text-lg font-semibold">{resolvedLocale === "pt-BR" ? "Os Estudos não puderam ser carregados por completo." : "Studies could not load completely."}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The {failedQueries.map(([name]) => name).join(", ")} query failed. Your saved work is
            unchanged.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              className="min-h-11"
              variant="outline"
              onClick={retryFailedQueries}
              disabled={failedQueries.some(([, query]) => query.isFetching)}
            >
              <RefreshCw />
              {resolvedLocale === "pt-BR" ? "Tentar novamente" : "Try again"}
            </Button>
            <Button className="min-h-11" variant="ghost" onClick={() => nav({ to: "/dashboard" })}>
              {resolvedLocale === "pt-BR" ? "Ir para o início" : "Go to dashboard"}
            </Button>
          </div>
        </div>
      ) : plans.isPending ? (
        <div
          className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Loading subjects"
          aria-live="polite"
        >
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-40 animate-pulse rounded-2xl border bg-muted/30 motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : studyPlans.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t("studies.empty")}
          description={t("studies.emptyHelp")}
        />
      ) : (
        <section className="mt-8" aria-labelledby="subjects-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[.2em] text-muted-foreground">
                {resolvedLocale === "pt-BR" ? "Sua biblioteca" : "Your library"}
              </p>
              <h2 id="subjects-title" className="mt-1 text-2xl font-semibold">
                {resolvedLocale === "pt-BR" ? "Matérias ativas" : "Active subjects"}
              </h2>
            </div>
            <span className="text-sm text-muted-foreground">{studyPlans.length} {resolvedLocale === "pt-BR" ? "no total" : "total"}</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {studyPlans.map((plan) => (
              <button
                key={plan.id}
                className="v2-surface group min-h-40 rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:border-intelligence/35 motion-reduce:transform-none"
                onClick={() => nav({ to: "/studies/$subjectId", params: { subjectId: plan.id } })}
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-intelligence">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <TrendingUp className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
                </div>
                <h3 className="mt-5 truncate text-lg font-semibold">{plan.title}</h3>
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock3 className="h-4 w-4" />
                  <span>{plan.progress}% {resolvedLocale === "pt-BR" ? "das sessões concluídas" : "sessions completed"}</span>
                </div>
                <div className="mt-3">
                  <WorkspaceProgress value={plan.progress} label={`${plan.title} progress`} />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crie seu espaço de aprendizagem</DialogTitle>
            <DialogDescription>
              Defina a matéria, o objetivo inicial e um ritmo para começar seu plano de estudos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-intelligence">
              1 · Matéria
            </p>
            <Label htmlFor="subject-name">O que você quer aprender?</Label>
            <Input
              id="subject-name"
              autoFocus
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Estatística aplicada"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-intelligence">
              2 · Objetivo
            </p>
            <Label htmlFor="subject-goal">O que você quer alcançar?</Label>
            <Textarea
              id="subject-goal"
              maxLength={160}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ex.: Resolver exercícios de regressão sem consultar anotações"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-intelligence">
              3 · Ritmo
            </p>
            <Label htmlFor="subject-rhythm">Com que frequência você quer estudar?</Label>
            <Input
              id="subject-rhythm"
              maxLength={100}
              value={rhythm}
              onChange={(e) => setRhythm(e.target.value)}
              placeholder="Ex.: 30 minutos, três vezes por semana"
            />
            <div className="flex items-center gap-3 pt-1">
              <Label htmlFor="subject-color" className="text-xs text-muted-foreground">
                Cor da matéria
              </Label>
              <Input
                className="h-11 w-16 p-1"
                id="subject-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="min-h-11"
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? (resolvedLocale === "pt-BR" ? "Criando…" : "Creating…") : (resolvedLocale === "pt-BR" ? "Criar e abrir" : "Create and open")}
          </Button>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
