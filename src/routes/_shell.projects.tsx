import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Folder, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ProjectService, TaskService, workspaceQueryKeys } from "@/services";
import { useAuth } from "@/lib/auth-context";
import { workspaceMutationError } from "@/lib/mutation-errors";
import { useLanguage } from "@/providers/language-provider";

export const Route = createFileRoute("/_shell/projects")({
  head: () => ({ meta: [{ title: "Projetos — KIVRYN" }] }),
  component: Projects,
});

type ProjectFilter = "all" | "active" | "completed";

function Projects() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname !== "/projects" && pathname !== "/projects/" ? <Outlet /> : <ProjectsIndex />;
}

function ProjectsIndex() {
  const { t } = useLanguage();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ProjectFilter>("all");
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

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (Array.isArray(projects.data) ? projects.data : []).filter((project) => {
      const status = project.status?.toLowerCase() ?? "active";
      const completed = status === "completed";
      const matchesFilter =
        filter === "all" || (filter === "completed" ? completed : !completed && status !== "archived");
      const matchesSearch =
        !needle ||
        `${project.title} ${project.objective ?? ""} ${project.description ?? ""}`
          .toLowerCase()
          .includes(needle);
      return matchesFilter && matchesSearch;
    });
  }, [filter, projects.data, search]);

  return (
    <PageShell>
      <header className="v2-workspace-header flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl md:text-4xl">{t("page.projects.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Seus projetos, sem distrações.</p>
        </div>
        <Button
          size="icon"
          className="h-11 w-11 shrink-0 rounded-full"
          aria-label="Criar projeto"
          onClick={() => setCreating(true)}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      <div className="mt-7 flex gap-2 overflow-x-auto pb-1" aria-label="Filtros de projetos">
        {([
          ["all", "Tudo"],
          ["active", "Ativos"],
          ["completed", "Concluídos"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === value
                ? "bg-foreground text-background"
                : "bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative mt-5">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar projetos"
          aria-label="Pesquisar projetos"
          className="h-12 rounded-full pl-11"
        />
      </div>

      {projects.isLoading ? (
        <Loading />
      ) : projects.isError ? (
        <ErrorState retry={() => void projects.refetch()} />
      ) : !Array.isArray(projects.data) || projects.data.length === 0 ? (
        <EmptyProjects onCreate={() => setCreating(true)} />
      ) : filtered.length === 0 ? (
        <section className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Nenhum projeto corresponde a este filtro.</p>
        </section>
      ) : (
        <section className="mt-5 divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-surface/20">
          {filtered.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              tasks={(Array.isArray(tasks.data) ? tasks.data : []).filter(
                (task) => task.projectId === project.id,
              )}
            />
          ))}
        </section>
      )}

      {tasks.isError && Array.isArray(projects.data) && projects.data.length > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          As tarefas não puderam ser atualizadas agora. Seus projetos continuam disponíveis.
        </p>
      ) : null}

      <CreateProject open={creating} onOpenChange={setCreating} />
    </PageShell>
  );
}

function ProjectRow({
  project,
  tasks,
}: {
  project: Awaited<ReturnType<typeof ProjectService.list>>[number];
  tasks: Awaited<ReturnType<typeof TaskService.listTasks>>;
}) {
  const navigate = useNavigate();
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const status = project.status?.toLowerCase() ?? "active";
  const completed = status === "completed";
  const updatedAt = project.updatedAt ? new Date(project.updatedAt) : null;
  const updatedLabel =
    updatedAt && !Number.isNaN(updatedAt.getTime())
      ? updatedAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
      : null;

  return (
    <button
      type="button"
      onClick={() =>
        void navigate({ to: "/projects/$projectId", params: { projectId: project.id } })
      }
      aria-label={`Abrir projeto ${project.title}`}
      className="group flex w-full min-w-0 items-center gap-4 px-4 py-4 text-left transition hover:bg-surface/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface text-muted-foreground">
        <Folder className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate font-medium text-foreground">{project.title}</h2>
          {completed ? (
            <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
              Concluído
            </span>
          ) : null}
        </div>
        {project.objective || project.description ? (
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {project.objective || project.description}
          </p>
        ) : null}
        <p className="mt-1.5 text-xs text-muted-foreground">
          {tasks.length ? `${completedTasks} de ${tasks.length} tarefas` : "Sem tarefas"}
          {updatedLabel ? ` · ${updatedLabel}` : ""}
        </p>
      </div>
      <span className="text-xl text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground">
        ›
      </span>
    </button>
  );
}

function EmptyProjects({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="mx-auto flex min-h-[52dvh] max-w-md flex-col items-center justify-center py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface">
        <Folder className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="mt-5 font-display text-2xl">Comece com um projeto</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Dê um nome ao objetivo e concentre tarefas, prazo e progresso em um só lugar.
      </p>
      <Button className="mt-6 rounded-full" onClick={onCreate}>
        <Plus className="h-4 w-4" /> Criar projeto
      </Button>
    </section>
  );
}

function Loading() {
  return (
    <div className="mt-5 divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex items-center gap-4 p-4 sm:p-5">
          <div className="h-11 w-11 animate-pulse rounded-xl bg-surface" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/5 animate-pulse rounded bg-surface" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ retry }: { retry: () => void }) {
  return (
    <section role="alert" className="mt-6 rounded-2xl border border-destructive/30 p-6">
      <h2 className="font-semibold">Não foi possível carregar seus projetos</h2>
      <p className="mt-2 text-sm text-muted-foreground">Seu trabalho salvo não foi alterado.</p>
      <Button variant="outline" className="mt-4 rounded-full" onClick={retry}>
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
  onOpenChange: (value: boolean) => void;
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
    onSuccess: async (project) => {
      await client.invalidateQueries({ queryKey: workspaceQueryKeys.projects(user?.id) });
      toast.success("Projeto criado");
      onOpenChange(false);
      setTitle("");
      setObjective("");
      setDescription("");
      navigate({ to: "/projects/$projectId", params: { projectId: project.id } });
    },
    onError: (error: unknown) => toast.error(workspaceMutationError(error).message),
  });

  return (
    <Sheet open={open} onOpenChange={(value) => !create.isPending && onOpenChange(value)}>
      <SheetContent
        side="right"
        className="flex h-dvh w-full max-w-xl flex-col overflow-hidden p-0 sm:w-[min(100%,36rem)]"
      >
        <SheetHeader className="border-b px-5 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top))] text-left">
          <SheetTitle className="font-display text-2xl">Novo projeto</SheetTitle>
          <p className="text-sm text-muted-foreground">Defina o objetivo. O restante pode evoluir dentro do projeto.</p>
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            if (title.trim()) create.mutate();
          }}
        >
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6">
            <div className="space-y-2">
              <Label htmlFor="project-title">Nome do projeto</Label>
              <Input
                id="project-title"
                autoFocus
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Lançar KIVRYN"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-goal">Resultado esperado</Label>
              <Textarea
                id="project-goal"
                maxLength={500}
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                placeholder="Como será quando estiver concluído?"
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
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Detalhes úteis para executar"
              />
            </div>
          </div>
          <div className="flex gap-3 border-t bg-background px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => onOpenChange(false)}
              disabled={create.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-full"
              disabled={!title.trim() || create.isPending}
            >
              {create.isPending ? <Loader2 className="animate-spin" /> : <Plus className="h-4 w-4" />}
              {create.isPending ? "Criando…" : "Criar"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
