import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  Circle,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AIService, ProjectService, TaskService, workspaceQueryKeys, type Task } from "@/services";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_shell/projects/$projectId")({
  component: ProjectWorkspace,
});
type Suggestion = { id: string; title: string; selected: boolean };

function ProjectWorkspace() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const projectKey = workspaceQueryKeys.projects(user?.id),
    taskKey = workspaceQueryKeys.tasks(user?.id);
  const [task, setTask] = useState<Task | null | undefined>();
  const [editing, setEditing] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const project = useQuery({
    queryKey: [...projectKey, projectId],
    queryFn: () => ProjectService.get(projectId),
    enabled: isAuthenticated && !!user,
  });
  const tasks = useQuery({
    queryKey: [...taskKey, projectId],
    queryFn: async () => (await TaskService.listTasks()).filter((t) => t.projectId === projectId),
    enabled: isAuthenticated && !!user,
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: projectKey }),
      client.invalidateQueries({ queryKey: taskKey }),
    ]);
  };
  const toggle = useMutation({
    mutationFn: TaskService.toggleTask,
    onSuccess: async () => {
      await refresh();
      toast.success("Tarefa atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: TaskService.removeTask,
    onSuccess: async () => {
      await refresh();
      toast.success("Tarefa excluída");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const destroy = useMutation({
    mutationFn: () => ProjectService.remove(projectId),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: projectKey }),
        client.invalidateQueries({ queryKey: taskKey }),
      ]);
      toast.success("Projeto excluído");
      navigate({ to: "/projects", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const open = useMemo(
    () => sortOpen((tasks.data ?? []).filter((t) => t.status === "open")),
    [tasks.data],
  );
  const done = (tasks.data ?? []).filter((t) => t.status === "done");
  const next = open[0];
  if (project.isLoading)
    return (
      <PageShell>
        <div className="space-y-4" aria-label="Carregando projeto">
          <div className="h-24 animate-pulse rounded-2xl bg-surface" />
          <div className="h-44 animate-pulse rounded-2xl bg-surface" />
        </div>
      </PageShell>
    );
  if (project.isError)
    return (
      <PageShell>
        <LocalError retry={() => project.refetch()} />
      </PageShell>
    );
  if (!project.data)
    return (
      <PageShell>
        <section className="mx-auto max-w-lg py-20 text-center">
          <AlertTriangle className="mx-auto h-9 w-9 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl">Projeto não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ele não existe ou não pertence à sua conta.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/projects">Voltar aos projetos</Link>
          </Button>
        </section>
      </PageShell>
    );
  const p = project.data,
    count = tasks.data?.length ?? 0;
  return (
    <PageShell>
      <div className="mb-5 flex items-center justify-between">
        <Button asChild variant="ghost" className="-ml-3">
          <Link to="/projects">
            <ArrowLeft /> Projetos
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Gerenciar projeto">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <Pencil />
              Editar projeto
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(true)}>
              <Trash2 />
              Excluir projeto
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <header className="border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border px-2 py-1">
            {statusLabel(p.status)}
          </span>
          {p.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(p.dueDate)}
            </span>
          )}
          {tasks.isFetching && !tasks.isLoading && (
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Atualizando
            </span>
          )}
        </div>
        <h1 className="mt-3 break-words font-display text-3xl leading-tight md:text-4xl">
          {p.title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {p.objective ||
            p.description ||
            "Defina o resultado esperado para manter a execução focada."}
        </p>
        <div className="mt-5 max-w-xl">
          <div className="flex justify-between text-sm">
            <span>
              {count
                ? `${done.length} de ${count} tarefas concluídas`
                : "Projeto ainda não planejado"}
            </span>
            {count > 0 && <span className="text-gold">{p.progress}%</span>}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-elevated">
            <div
              className="h-full rounded-full bg-gold transition-[width]"
              style={{ width: count ? `${p.progress}%` : "0%" }}
            />
          </div>
        </div>
      </header>
      {tasks.isError ? (
        <LocalError retry={() => tasks.refetch()} />
      ) : (
        <div className="mt-7 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,.7fr)]">
          <main className="min-w-0 space-y-8">
            <section className="overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/10 via-surface to-surface">
              <div className="border-b border-gold/15 px-5 py-3 text-xs font-medium tracking-wide text-gold">
                PRÓXIMA AÇÃO
              </div>
              {next ? (
                <div className="flex items-start gap-4 p-5">
                  <button
                    className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/40 text-gold"
                    onClick={() => toggle.mutate(next.id)}
                    disabled={toggle.isPending}
                    aria-label={`Concluir ${next.title}`}
                  >
                    <Check className="h-5 w-5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words font-display text-xl">{next.title}</h2>
                    <TaskMeta task={next} />
                    {next.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{next.description}</p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setTask(next)}
                    aria-label="Editar próxima tarefa"
                  >
                    <Pencil />
                  </Button>
                </div>
              ) : (
                <div className="p-5">
                  <h2 className="font-display text-xl">Defina o próximo movimento</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Adicione uma tarefa ou gere uma proposta para revisar.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => setTask(null)}>
                      <Plus />
                      Adicionar tarefa
                    </Button>
                    <Button variant="outline" onClick={() => setPlanning(true)}>
                      <Sparkles />
                      Planejar com IA
                    </Button>
                  </div>
                </div>
              )}
            </section>
            <section>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl">Execução</h2>
                  <p className="text-sm text-muted-foreground">O que falta e o que já avançou.</p>
                </div>
                <Button onClick={() => setTask(null)}>
                  <Plus />
                  <span className="hidden min-[360px]:inline">Nova tarefa</span>
                </Button>
              </div>
              <TaskGroup
                title="A fazer"
                tasks={open}
                empty="Nenhuma tarefa aberta."
                onToggle={(id) => toggle.mutate(id)}
                onEdit={setTask}
                onDelete={(id) => {
                  if (confirm("Excluir esta tarefa? Esta ação não pode ser desfeita."))
                    remove.mutate(id);
                }}
                pending={toggle.isPending || remove.isPending}
              />
              {done.length > 0 && (
                <TaskGroup
                  title="Concluídas"
                  tasks={done}
                  onToggle={(id) => toggle.mutate(id)}
                  onEdit={setTask}
                  onDelete={(id) => {
                    if (confirm("Excluir esta tarefa? Esta ação não pode ser desfeita."))
                      remove.mutate(id);
                  }}
                  pending={toggle.isPending || remove.isPending}
                />
              )}
            </section>
          </main>
          <aside className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-2xl border border-border p-5">
              <h2 className="font-display text-lg">Resultado</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {p.objective || "Nenhum resultado definido."}
              </p>
              {p.description && (
                <>
                  <div className="my-4 border-t border-border" />
                  <h3 className="text-sm font-medium">Contexto</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {p.description}
                  </p>
                </>
              )}
            </section>
            <Button className="w-full" variant="outline" onClick={() => setPlanning(true)}>
              <Sparkles />
              Planejar com IA
            </Button>
          </aside>
        </div>
      )}
      <TaskForm
        task={task}
        projectId={projectId}
        close={() => setTask(undefined)}
        saved={async () => {
          setTask(undefined);
          await refresh();
        }}
      />
      <ProjectForm open={editing} close={() => setEditing(false)} project={p} saved={refresh} />
      <PlanDialog
        open={planning}
        close={() => setPlanning(false)}
        project={p}
        tasks={tasks.data ?? []}
        refresh={refresh}
      />
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir “{p.title}”?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O projeto será removido. As tarefas existentes serão desvinculadas conforme a relação
            atual do banco.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleting(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={destroy.isPending}
              onClick={() => destroy.mutate()}
            >
              {destroy.isPending && <Loader2 className="animate-spin" />}Excluir projeto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function sortOpen(items: Task[]) {
  return [...items].sort((a, b) => {
    const rank = (t: Task) => (isOverdue(t) ? 0 : t.priority === "high" ? 1 : t.dueDate ? 2 : 3);
    return rank(a) - rank(b) || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
  });
}
function isOverdue(t: Task) {
  return !!t.dueDate && new Date(`${t.dueDate.slice(0, 10)}T23:59:59`) < new Date();
}
function formatDate(v: string) {
  return new Date(`${v.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}
function statusLabel(v?: string) {
  return v === "completed" ? "Concluído" : v === "paused" ? "Pausado" : "Ativo";
}
function TaskMeta({ task }: { task: Task }) {
  return (
    <p className={`mt-1 text-xs ${isOverdue(task) ? "text-destructive" : "text-muted-foreground"}`}>
      {task.priority === "high"
        ? "Prioridade alta"
        : task.priority === "low"
          ? "Prioridade baixa"
          : "Prioridade média"}
      {task.dueDate
        ? ` · ${isOverdue(task) ? "Atrasada · " : ""}${formatDate(task.dueDate)}`
        : " · Sem prazo"}
    </p>
  );
}
function TaskGroup({
  title,
  tasks,
  empty,
  onToggle,
  onEdit,
  onDelete,
  pending,
}: {
  title: string;
  tasks: Task[];
  empty?: string;
  onToggle: (id: string) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  pending: boolean;
}) {
  return (
    <div className="mt-5">
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
        {title}{" "}
        <span className="ml-1 rounded-full bg-surface px-2 py-0.5 text-xs">{tasks.length}</span>
      </h3>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {tasks.map((t) => (
          <article key={t.id} className="flex min-w-0 items-start gap-3 bg-surface/30 p-4">
            <button
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
              onClick={() => onToggle(t.id)}
              disabled={pending}
              aria-label={t.status === "done" ? `Reabrir ${t.title}` : `Concluir ${t.title}`}
            >
              {t.status === "done" ? (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gold text-background">
                  <Check className="h-4 w-4" />
                </span>
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
            </button>
            <button className="min-w-0 flex-1 py-1 text-left" onClick={() => onEdit(t)}>
              <span
                className={`block break-words ${t.status === "done" ? "text-muted-foreground line-through" : ""}`}
              >
                {t.title}
              </span>
              <TaskMeta task={t} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" aria-label={`Ações de ${t.title}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(t)}>
                  <Pencil />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(t.id)}>
                  <Trash2 />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </article>
        ))}
        {!tasks.length && <p className="p-5 text-sm text-muted-foreground">{empty}</p>}
      </div>
    </div>
  );
}
function LocalError({ retry }: { retry: () => void }) {
  return (
    <section role="alert" className="mt-6 rounded-2xl border border-destructive/30 p-6">
      <h2 className="font-semibold">Não foi possível carregar este espaço</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Seu trabalho salvo não foi alterado. Verifique a conexão.
      </p>
      <Button className="mt-4" variant="outline" onClick={retry}>
        Tentar novamente
      </Button>
    </section>
  );
}
function TaskForm({
  task,
  projectId,
  close,
  saved,
}: {
  task: Task | null | undefined;
  projectId: string;
  close: () => void;
  saved: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState(task?.priority ?? "medium");
  const [due, setDue] = useState(task?.dueDate?.slice(0, 10) ?? "");
  const save = useMutation({
    mutationFn: async () => {
      if (task)
        await TaskService.updateTask(task.id, {
          title: title.trim(),
          description: description.trim(),
          priority,
          due_date: due || null,
          project_id: projectId,
        });
      else
        await TaskService.createTask({
          title: title.trim(),
          description: description.trim(),
          priority,
          dueDate: due || null,
          projectId,
        });
    },
    onSuccess: () => {
      toast.success(task ? "Tarefa atualizada" : "Tarefa criada");
      saved();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={task !== undefined} onOpenChange={(o) => !o && !save.isPending && close()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="task-title">O que precisa ser feito?</Label>
            <Input
              id="task-title"
              autoFocus
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">
              Detalhes <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 min-[360px]:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-priority">Prioridade</Label>
              <select
                id="task-priority"
                className="h-11 w-full rounded-md border border-input bg-background px-3"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due">Prazo</Label>
              <Input
                id="task-due"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" />}Salvar tarefa
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({
  open,
  close,
  project,
  saved,
}: {
  open: boolean;
  close: () => void;
  project: Awaited<ReturnType<typeof ProjectService.get>> & {};
  saved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(project?.title ?? "");
  const [objective, setObjective] = useState(project?.objective ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState(project?.status ?? "active");
  const save = useMutation({
    mutationFn: () =>
      ProjectService.update(project!.id, {
        title: title.trim(),
        objective: objective.trim(),
        description: description.trim(),
        status,
      }),
    onSuccess: async () => {
      await saved();
      toast.success("Projeto atualizado");
      close();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar projeto</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="edit-project-title">Nome</Label>
            <Input
              id="edit-project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-project-goal">Resultado</Label>
            <Textarea
              id="edit-project-goal"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-project-context">Contexto</Label>
            <Textarea
              id="edit-project-context"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-project-status">Status</Label>
            <select
              id="edit-project-status"
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Ativo</option>
              <option value="paused">Pausado</option>
              <option value="completed">Concluído</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" />}Salvar alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PlanDialog({
  open,
  close,
  project,
  tasks,
  refresh,
}: {
  open: boolean;
  close: () => void;
  project: NonNullable<Awaited<ReturnType<typeof ProjectService.get>>>;
  tasks: Task[];
  refresh: () => Promise<void>;
}) {
  const [instruction, setInstruction] = useState(
    "Crie um plano prático para alcançar este resultado.",
  );
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const generate = useMutation({
    mutationFn: async () => {
      const result = await AIService.execute("content_generation", {
        operation: "draft",
        title: `Plano de execução: ${project.title}`,
        text: [
          "Return ONLY a JSON array of 3 to 8 concise task titles. No markdown or commentary.",
          `Project: ${project.title}`,
          `Objective: ${project.objective || project.description || "Not provided"}`,
          `Existing tasks: ${tasks.map((t) => t.title).join("; ") || "None"}`,
          `Instruction: ${instruction.trim()}`,
        ].join("\n"),
      });
      return parseSuggestedTasks(result.content);
    },
    onSuccess: (values) =>
      setSuggestions(
        values.map((title, index) => ({
          id: `suggestion-${Date.now()}-${index}`,
          title,
          selected: true,
        })),
      ),
    onError: (e: Error) => toast.error(e.message || "Não foi possível gerar o plano"),
  });
  const confirm = useMutation({
    mutationFn: async () => {
      const selected = suggestions.filter((s) => s.selected && s.title.trim());
      const created: Task[] = [];
      for (const item of selected)
        created.push(
          await TaskService.createTask({ title: item.title.trim(), projectId: project.id }),
        );
      return created.length;
    },
    onSuccess: async (count) => {
      await refresh();
      toast.success(`${count} ${count === 1 ? "tarefa adicionada" : "tarefas adicionadas"}`);
      setSuggestions([]);
      close();
    },
    onError: (e: Error) =>
      toast.error(`${e.message}. Verifique as tarefas visíveis antes de tentar novamente.`),
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !generate.isPending && !confirm.isPending) close();
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-gold" />
            Planejar com IA
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <p className="font-medium">{project.title}</p>
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
            {project.objective || project.description || "Sem resultado informado"}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {tasks.length} tarefas existentes serão enviadas como contexto.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-instruction">Orientação para o plano</Label>
          <Textarea
            id="plan-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
          />
        </div>
        <Button
          onClick={() => generate.mutate()}
          disabled={generate.isPending || !instruction.trim()}
        >
          {generate.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {suggestions.length ? "Gerar outra proposta" : "Gerar proposta"}
        </Button>
        {generate.isError && (
          <p role="alert" className="text-sm text-destructive">
            Nada foi salvo. Ajuste a orientação ou tente novamente.
          </p>
        )}
        {suggestions.length > 0 && (
          <section className="space-y-3">
            <div>
              <h3 className="font-semibold">Revise antes de adicionar</h3>
              <p className="text-sm text-muted-foreground">
                Edite, desmarque ou remova itens. Nada está salvo ainda.
              </p>
            </div>
            {suggestions.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <Checkbox
                  checked={item.selected}
                  onCheckedChange={(checked) =>
                    setSuggestions((c) =>
                      c.map((v, i) => (i === index ? { ...v, selected: checked === true } : v)),
                    )
                  }
                  aria-label={`Selecionar tarefa ${index + 1}`}
                />
                <Input
                  value={item.title}
                  maxLength={160}
                  onChange={(e) =>
                    setSuggestions((c) =>
                      c.map((v, i) => (i === index ? { ...v, title: e.target.value } : v)),
                    )
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remover tarefa ${index + 1}`}
                  onClick={() => setSuggestions((c) => c.filter((_, i) => i !== index))}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={close}>
                Cancelar
              </Button>
              <Button
                onClick={() => confirm.mutate()}
                disabled={
                  confirm.isPending || !suggestions.some((s) => s.selected && s.title.trim())
                }
              >
                {confirm.isPending && <Loader2 className="animate-spin" />}Adicionar selecionadas
              </Button>
            </div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
function parseSuggestedTasks(raw: string): string[] {
  const candidate = raw.match(/\[[\s\S]*\]/)?.[0];
  if (!candidate) throw new Error("A IA não retornou uma lista válida");
  let value: unknown;
  try {
    value = JSON.parse(candidate);
  } catch {
    throw new Error("A proposta veio em formato inválido; nenhuma tarefa foi criada");
  }
  if (!Array.isArray(value))
    throw new Error("A proposta veio em formato inválido; nenhuma tarefa foi criada");
  const result = value
    .filter((v): v is string => typeof v === "string")
    .map((v) =>
      v
        .trim()
        .replace(/^[-*]\s*/, "")
        .slice(0, 160),
    )
    .filter(Boolean)
    .slice(0, 8);
  if (!result.length) throw new Error("A proposta não continha tarefas válidas");
  return [...new Set(result)];
}
