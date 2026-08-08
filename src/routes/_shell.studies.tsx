import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { StudyService, workspaceQueryKeys } from "@/services";

export const Route = createFileRoute("/_shell/studies")({ component: Studies });

function Studies() {
  const nav = useNavigate();
  const client = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const key = workspaceQueryKeys.studies(user?.id);
  const [open, setOpen] = useState(false);
  const plans = useQuery({
    queryKey: key,
    queryFn: StudyService.listPlans,
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
  const hasInvalidPlans = plans.data !== undefined && !Array.isArray(plans.data);
  const secondaryQueriesFailed = subjects.isError || sessions.isError || goals.isError;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (plans.isError) console.error("[Studies] Subjects query failed", plans.error);
    if (subjects.isError)
      console.error("[Studies] Subject navigation query failed", subjects.error);
    if (sessions.isError) console.error("[Studies] Sessions query failed", sessions.error);
    if (goals.isError) console.error("[Studies] Goals query failed", goals.error);
    if (hasInvalidPlans)
      console.error("[Studies] Study plans query returned a non-array", plans.data);
  }, [
    goals.error,
    goals.isError,
    hasInvalidPlans,
    plans.data,
    plans.error,
    plans.isError,
    sessions.error,
    sessions.isError,
    subjects.error,
    subjects.isError,
  ]);
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
    onError: (error: Error) =>
      toast.error("Não foi possível criar a matéria", { description: error.message }),
  });

  return (
    <PageShell>
      <PageHeader
        eyebrow="Learning workspace"
        title="Studies"
        description="Keep every subject, focused session and AI study tool in one clear workspace."
        actions={
          <Button className="min-h-11" onClick={() => setOpen(true)}>
            <Plus />
            New subject
          </Button>
        }
      />
      {!plans.isPending && !plans.isError && !hasInvalidPlans && studyPlans.length > 0 && (
        <section
          className="relative mt-8 overflow-hidden rounded-3xl border bg-card p-6 shadow-sm sm:p-8"
          aria-labelledby="learning-overview-title"
        >
          <div
            className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-violet-500/10 to-transparent sm:block"
            aria-hidden="true"
          />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/12 text-violet-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[.22em] text-violet-300">
                Learning pulse
              </p>
              <h2
                id="learning-overview-title"
                className="mt-2 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                Continue building durable knowledge.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Every metric below is calculated from your persisted subjects and completed
                sessions.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-32 rounded-2xl border bg-background/70 p-4">
                <p className="text-2xl font-semibold tabular-nums">{studyPlans.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Active subjects</p>
              </div>
              <div className="min-w-32 rounded-2xl border bg-background/70 p-4">
                <p className="text-2xl font-semibold tabular-nums">
                  {Math.round(
                    studyPlans.reduce((total, plan) => total + plan.progress, 0) /
                      studyPlans.length,
                  )}
                  %
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Avg. completion</p>
              </div>
            </div>
          </div>
        </section>
      )}
      {!plans.isPending && !plans.isError && !hasInvalidPlans && studyPlans.length > 0 && (
        <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
          <section className="rounded-2xl border bg-card p-5" aria-labelledby="study-today">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">
                  Today
                </p>
                <h2 id="study-today" className="mt-1 text-xl font-semibold">
                  Your next learning move
                </h2>
              </div>
              <Button
                onClick={() =>
                  nav({
                    to: "/studies/$subjectId",
                    params: { subjectId: studySubjects[0]?.id ?? studyPlans[0].id },
                  })
                }
              >
                Start studying
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
                      <Target className="h-3.5 w-3.5" /> Open goal
                    </span>
                    <strong className="mt-2 block truncate text-sm">{goal.title}</strong>
                  </button>
                ))}
              {!studyGoals.some((goal) => !goal.completed) && (
                <p className="text-sm text-muted-foreground">
                  No open goals. Continue your most recent subject or create a goal in its
                  workspace.
                </p>
              )}
            </div>
          </section>
          <section className="rounded-2xl border bg-card p-5" aria-labelledby="study-progress">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-muted-foreground">
              Progress
            </p>
            <h2 id="study-progress" className="mt-1 text-xl font-semibold">
              Real activity
            </h2>
            <dl className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">Sessions</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{studySessions.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Minutes</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  {studySessions.reduce((sum, item) => sum + (item.duration ?? 0), 0)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Goals</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{studyGoals.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Completed</dt>
                <dd className="mt-1 flex items-center gap-1 text-2xl font-semibold tabular-nums">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  {studyGoals.filter((item) => item.completed).length}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      )}
      {secondaryQueriesFailed && !plans.isPending && !plans.isError && !hasInvalidPlans && (
        <div
          className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5"
          role="alert"
        >
          <h2 className="font-semibold">Some study activity could not be loaded.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your subjects are still available. Retry to restore goals, sessions, and navigation
            details.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => Promise.all([subjects.refetch(), sessions.refetch(), goals.refetch()])}
            >
              <RefreshCw />
              Retry activity
            </Button>
            <Button variant="ghost" onClick={() => nav({ to: "/" })}>
              Go to dashboard
            </Button>
          </div>
        </div>
      )}
      {plans.isPending ? (
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
      ) : plans.isError || hasInvalidPlans ? (
        <div
          className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-6"
          role="alert"
        >
          <h2 className="text-lg font-semibold">We couldn't load your subjects.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Check your connection and try again. Your saved work is unchanged.
          </p>
          <Button
            className="mt-5 min-h-11"
            variant="outline"
            onClick={() => plans.refetch()}
            disabled={plans.isFetching}
          >
            <RefreshCw />
            Try again
          </Button>
          <Button className="mt-5 ml-2 min-h-11" variant="ghost" onClick={() => nav({ to: "/" })}>
            Go to dashboard
          </Button>
        </div>
      ) : !studyPlans.length ? (
        <EmptyState
          icon={BookOpen}
          title="No subjects yet"
          description="Create a subject to organize sessions and study with focused AI tools."
        />
      ) : (
        <section className="mt-8" aria-labelledby="subjects-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[.2em] text-muted-foreground">
                Your library
              </p>
              <h2 id="subjects-title" className="mt-1 text-2xl font-semibold">
                Active subjects
              </h2>
            </div>
            <span className="text-sm text-muted-foreground">{studyPlans.length} total</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {studyPlans.map((plan) => (
              <button
                key={plan.id}
                className="group min-h-40 rounded-2xl border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg motion-reduce:transform-none"
                onClick={() => nav({ to: "/studies/$subjectId", params: { subjectId: plan.id } })}
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <TrendingUp className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
                </div>
                <h3 className="mt-5 truncate text-lg font-semibold">{plan.title}</h3>
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock3 className="h-4 w-4" />
                  <span>{plan.progress}% sessions completed</span>
                </div>
                <div
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={plan.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${plan.title} progress`}
                >
                  <div
                    className="h-full rounded-full bg-violet-400 transition-[width] motion-reduce:transition-none"
                    style={{ width: `${plan.progress}%` }}
                  />
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
              Defina a matéria, o objetivo e um ritmo opcional para começar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">
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
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">
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
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">
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
            {create.isPending ? "Creating…" : "Create and open"}
          </Button>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
