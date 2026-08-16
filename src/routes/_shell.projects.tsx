import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, FolderKanban, Loader2, Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ProjectService, TaskService, workspaceQueryKeys } from "@/services";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_shell/projects")({
  head: () => ({ meta: [{ title: "Projetos — NEXORA" }] }),
  component: Projects,
});

function Projects() {
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const { user, isAuthenticated } = useAuth();
  const projectKey = workspaceQueryKeys.projects(user?.id);
  const taskKey = workspaceQueryKeys.tasks(user?.id);
  const projects = useQuery({
    queryKey: projectKey,
    queryFn: ProjectService.list,
    enabled: isAuthenticated && !!user,
  });
  const tasks = useQuery({
    queryKey: taskKey,
    queryFn: () => TaskService.listTasks(),
    enabled: isAuthenticated && !!user,
  });
  const filtered = useMemo(
    () =>
      (Array.isArray(projects.data) ? projects.data : []).filter((p) =>
        `${p.title} ${p.objective ?? ""} ${p.description ?? ""}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      ),
    [projects.data, search],
  );
  const active = filtered.filter((p) => p.status !== "completed");
  const completed = filtered.filter((p) => p.status === "completed");

  return (
    <PageShell>
      <header className="flex items-end justify-between gap-4 border-b border-border pb-5">
        <div className="min-w-0">
          <h1 className="font-display text-3xl md:text-4xl">Projetos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Retome o resultado que precisa da sua atenção.
          </p>
        </div>
        <Button className="shrink-0" onClick={() => setCreating(true)}>
          <Plus /> <span className="hidden min-[360px]:inline">Novo projeto</span>
          <span className="min-[360px]:hidden">Novo</span>
        </Button>
      </header>
      {projects.isLoading || tasks.isLoading ? (
        <Loading />
      ) : projects.isError || tasks.isError ? (
        <ErrorState
          retry={() => {
            projects.refetch();
            tasks.refetch();
          }}
        />
      ) : !(Array.isArray(projects.data) && projects.data.length) ? (
        <section className="mx-auto flex min-h-[58dvh] max-w-lg flex-col justify-center py-12 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-gold/20 bg-gold/10">
            <FolderKanban className="h-8 w-8 text-gold" />
          </div>
          <h2 className="mt-6 font-display text-2xl">Transforme um objetivo em próximas ações</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Crie um espaço para planejar, executar e continuar de onde parou.
          </p>
          <Button className="mx-auto mt-7" onClick={() => setCreating(true)}>
            Criar primeiro projeto <ArrowRight />
          </Button>
        </section>
      ) : (
        <div className="mt-7 space-y-9">
          <section>
            <div className="mb-4">
              <p className="text-xs font-medium text-gold">CONTINUAR</p>
              <h2 className="mt-1 font-display text-2xl">Trabalho ativo</h2>
            </div>
            {active.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {active.slice(0, 4).map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    tasks={(Array.isArray(tasks.data) ? tasks.data : []).filter(
                      (t) => t.projectId === project.id,
                    )}
                    featured
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-border p-5 text-sm text-muted-foreground">
                Nenhum projeto ativo. Seus projetos concluídos continuam disponíveis abaixo.
              </p>
            )}
          </section>
          <section>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-xl">Todos os projetos</h2>
              <div className="relative sm:w-72">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar projetos"
                  aria-label="Buscar projetos"
                />
              </div>
            </div>
            <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface/30">
              {[...active, ...completed].map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  tasks={(Array.isArray(tasks.data) ? tasks.data : []).filter(
                    (t) => t.projectId === project.id,
                  )}
                />
              ))}
              {!filtered.length && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Nenhum projeto corresponde à busca.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
      <CreateProject open={creating} onOpenChange={setCreating} />
    </PageShell>
  );
}

function ProjectRow({
  project,
  tasks,
  featured = false,
}: {
  project: Awaited<ReturnType<typeof ProjectService.list>>[number];
  tasks: Awaited<ReturnType<typeof TaskService.listTasks>>;
  featured?: boolean;
}) {
  const open = tasks.filter((t) => t.status === "open");
  const next = chooseNext(open);
  const overdue = open.filter(
    (t) => t.dueDate && new Date(`${t.dueDate.slice(0, 10)}T23:59:59`) < new Date(),
  ).length;
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className={`${featured ? "rounded-2xl border border-border bg-gradient-to-br from-surface-elevated to-surface p-5" : "flex p-4"} group min-w-0 items-center gap-4 transition hover:border-gold/40`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className={`${featured ? "font-display text-xl" : "font-medium"} truncate`}>
            {project.title}
          </h3>
          {project.status === "completed" && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
              Concluído
            </span>
          )}
        </div>
        {featured && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {project.objective || project.description || "Defina o resultado deste projeto."}
          </p>
        )}
        <div
          className={`${featured ? "mt-5" : "mt-2"} flex items-center gap-3 text-xs text-muted-foreground`}
        >
          <span>
            {tasks.length
              ? `${project.completedTasks ?? 0} de ${project.totalTasks ?? 0} tarefas`
              : "Ainda não planejado"}
          </span>
          {overdue > 0 && <span className="text-destructive">{overdue} em atraso</span>}
        </div>
        {featured && (
          <>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-gold"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <p className="mt-3 truncate text-sm">
              <span className="text-muted-foreground">Próxima: </span>
              {next?.title ?? "Planejar a primeira ação"}
            </p>
          </>
        )}
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-gold" />
    </Link>
  );
}

function chooseNext<T extends { priority?: string; dueDate?: string | null }>(
  items: T[],
): T | undefined {
  return [...items].sort((a, b) => {
    const overdue = (x: T) =>
      x.dueDate && new Date(`${x.dueDate.slice(0, 10)}T23:59:59`) < new Date() ? 0 : 1;
    return (
      overdue(a) - overdue(b) ||
      (a.priority === "high" ? 0 : 1) - (b.priority === "high" ? 0 : 1) ||
      (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")
    );
  })[0];
}
function Loading() {
  return (
    <div className="mt-8 space-y-3" aria-label="Carregando projetos">
      <div className="h-32 animate-pulse rounded-2xl bg-surface" />
      <div className="h-20 animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}
function ErrorState({ retry }: { retry: () => void }) {
  return (
    <section role="alert" className="mt-8 rounded-2xl border border-destructive/30 p-6">
      <h2 className="font-semibold">Não foi possível carregar seus projetos</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Verifique sua conexão. Seu trabalho salvo não foi alterado.
      </p>
      <Button variant="outline" className="mt-4" onClick={retry}>
        Tentar novamente
      </Button>
    </section>
  );
}

function CreateProject({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [description, setDescription] = useState("");
  const create = useMutation({
    mutationFn: () =>
      ProjectService.create({
        title,
        objective,
        description,
        status: "active",
        priority: "medium",
      }),
    onSuccess: async (p) => {
      await client.invalidateQueries({ queryKey: workspaceQueryKeys.projects(user?.id) });
      toast.success("Projeto criado");
      onOpenChange(false);
      setTitle("");
      setObjective("");
      setDescription("");
      navigate({ to: "/projects/$projectId", params: { projectId: p.id } });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível criar o projeto"),
  });
  return (
    <Sheet open={open} onOpenChange={(v) => !create.isPending && onOpenChange(v)}>
      <SheetContent
        side="right"
        className="flex h-dvh w-full max-w-xl flex-col overflow-hidden p-0 sm:w-[min(100%,36rem)]"
      >
        <SheetHeader className="border-b px-5 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top))] text-left">
          <div className="flex items-center gap-2 text-sm text-gold">
            <Sparkles className="h-4 w-4" /> Defina o resultado
          </div>
          <SheetTitle className="font-display text-2xl">Novo projeto</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Comece pelo que você quer tornar realidade.
          </p>
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) create.mutate();
          }}
        >
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6">
            <div className="space-y-2">
              <Label htmlFor="project-title">No que você está trabalhando?</Label>
              <Input
                id="project-title"
                autoFocus
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Lançar meu novo portfólio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-goal">Como é o resultado concluído?</Label>
              <Textarea
                id="project-goal"
                maxLength={500}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Descreva um resultado claro e observável"
                className="min-h-28"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-context">
                Contexto <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="project-context"
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes que ajudarão você a executar"
              />
            </div>
            {create.isError && (
              <p role="alert" className="text-sm text-destructive">
                Nada foi criado. Revise sua conexão e tente novamente.
              </p>
            )}
          </div>
          <div className="flex gap-3 border-t bg-background px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={create.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={!title.trim() || create.isPending}>
              {create.isPending && <Loader2 className="animate-spin" />}
              {create.isPending ? "Criando…" : "Criar e planejar"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
