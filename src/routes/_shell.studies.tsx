import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Clock3, Plus, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [name, setName] = useState("");
  const [color, setColor] = useState("#8b5cf6");
  const create = useMutation({
    mutationFn: () => StudyService.createSubject({ name: name.trim(), color }),
    onSuccess: async (subject) => {
      await client.invalidateQueries({ queryKey: key });
      setOpen(false);
      setName("");
      nav({ to: "/studies/$subjectId", params: { subjectId: subject.id } });
    },
    onError: () => toast.error("We couldn't create this subject. Please try again."),
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
      ) : plans.isError ? (
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
        </div>
      ) : !plans.data.length ? (
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
            <span className="text-sm text-muted-foreground">{plans.data.length} total</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {plans.data.map((plan) => (
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
            <DialogTitle>New subject</DialogTitle>
          </DialogHeader>
          <Label htmlFor="subject-name">Name</Label>
          <Input
            id="subject-name"
            autoFocus
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Label htmlFor="subject-color">Color</Label>
          <Input
            id="subject-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
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
