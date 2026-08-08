import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProjectService, TaskService, workspaceQueryKeys, type Task } from "@/services";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_shell/productivity")({
  head: () => ({ meta: [{ title: "Produtividade — NEXORA" }] }),
  component: Productivity,
});
type View = "inbox" | "today" | "upcoming" | "overdue" | "done";
type Priority = "all" | "high" | "medium" | "low";
const viewLabels: Record<View, string> = {
  inbox: "Inbox",
  today: "Hoje",
  upcoming: "Próximas",
  overdue: "Atrasadas",
  done: "Concluídas",
};
const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
const localDay = (value: string | Date) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function Productivity() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const tasksKey = workspaceQueryKeys.tasks(user?.id);
  const projectsKey = workspaceQueryKeys.projects(user?.id);
  const [view, setView] = useState<View>("today");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<Priority>("all");
  const [editing, setEditing] = useState<Task | null | undefined>();
  const [quickTitle, setQuickTitle] = useState("");
  const tasksQuery = useQuery({
    queryKey: tasksKey,
    queryFn: () => TaskService.listTasks(),
    enabled: isAuthenticated && !!user,
  });
  const projectsQuery = useQuery({
    queryKey: projectsKey,
    queryFn: () => ProjectService.list(),
    enabled: isAuthenticated && !!user,
  });
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: tasksKey }),
      client.invalidateQueries({ queryKey: projectsKey }),
    ]);
  const toggle = useMutation({
    mutationFn: TaskService.toggleTask,
    onSuccess: () => void refresh(),
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: TaskService.removeTask,
    onSuccess: () => void refresh(),
    onError: (error: Error) => toast.error(error.message),
  });
  const quickAdd = useMutation({
    mutationFn: () =>
      TaskService.createTask({
        title: quickTitle.trim(),
        dueDate: view === "today" ? localDay(new Date()) : null,
        priority: "medium",
      }),
    onSuccess: () => {
      setQuickTitle("");
      toast.success("Tarefa criada. Ela já está pronta para execução.");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const projects = projectsQuery.data ?? [];
  const today = localDay(new Date());
  const tasks = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return (tasksQuery.data ?? [])
      .filter((task) => {
        const due = task.dueDate ? localDay(task.dueDate) : null;
        const matchesSearch = `${task.title} ${task.description ?? ""}`
          .toLowerCase()
          .includes(searchValue);
        const matchesPriority = priority === "all" || task.priority === priority;
        const matchesView =
          (view === "inbox" && task.status === "open") ||
          (view === "today" && task.status === "open" && !!due && due <= today) ||
          (view === "upcoming" && task.status === "open" && !!due && due > today) ||
          (view === "overdue" && task.status === "open" && !!due && due < today) ||
          (view === "done" && task.status === "done");
        return matchesSearch && matchesPriority && matchesView;
      })
      .sort((a, b) => {
        const priorityDifference =
          (priorityOrder[a.priority ?? "medium"] ?? 1) -
          (priorityOrder[b.priority ?? "medium"] ?? 1);
        if (priorityDifference) return priorityDifference;
        return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
      });
  }, [priority, search, tasksQuery.data, today, view]);
  const todayGroups = [
    {
      title: "Focus now",
      description: "Alta prioridade e itens atrasados",
      tasks: tasks.filter(
        (t) => t.priority === "high" || (t.dueDate && localDay(t.dueDate) < today),
      ),
    },
    {
      title: "Next",
      description: "Prioridade média para manter o ritmo",
      tasks: tasks.filter(
        (t) => t.priority === "medium" && (!t.dueDate || localDay(t.dueDate) >= today),
      ),
    },
    {
      title: "Later today",
      description: "Baixa prioridade, se ainda houver espaço",
      tasks: tasks.filter(
        (t) => t.priority === "low" && (!t.dueDate || localDay(t.dueDate) >= today),
      ),
    },
  ];
  return (
    <PageShell>
      <PageHeader
        eyebrow="Execução diária"
        title="Produtividade"
        description="Decida o que fazer agora, conclua e veja o progresso refletido nos projetos."
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus /> Nova tarefa
          </Button>
        }
      />
      <form
        className="mt-6 flex gap-2 rounded-2xl border bg-surface/60 p-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (quickTitle.trim()) quickAdd.mutate();
        }}
      >
        <Input
          aria-label="Adicionar tarefa rapidamente"
          className="border-0 bg-transparent shadow-none"
          value={quickTitle}
          onChange={(event) => setQuickTitle(event.target.value)}
          placeholder={view === "today" ? "Adicionar ao meu dia…" : "Capturar uma tarefa…"}
        />
        <Button type="submit" disabled={!quickTitle.trim() || quickAdd.isPending}>
          <Plus />
          <span className="hidden sm:inline">Adicionar</span>
        </Button>
      </form>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Listas de tarefas">
        {(Object.keys(viewLabels) as View[]).map((item) => (
          <Button
            key={item}
            size="sm"
            variant={view === item ? "default" : "outline"}
            onClick={() => setView(item)}
          >
            {viewLabels[item]}
          </Button>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por título ou descrição"
          />
        </div>
        <select
          aria-label="Filtrar prioridade"
          className="h-11 rounded-md border border-input bg-background px-3"
          value={priority}
          onChange={(event) => setPriority(event.target.value as Priority)}
        >
          <option value="all">Todas as prioridades</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>
      </div>
      {tasksQuery.isLoading ? (
        <p className="mt-10 text-center text-muted-foreground">Carregando tarefas…</p>
      ) : tasksQuery.isError ? (
        <EmptyState
          icon={Search}
          title="Tarefas indisponíveis"
          description={(tasksQuery.error as Error).message}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={Check}
          title="Nada nesta lista"
          description={
            view === "today"
              ? "Seu dia está livre. Capture uma tarefa acima ou abra outra lista."
              : "Crie uma tarefa ou ajuste os filtros."
          }
          action={<Button onClick={() => setEditing(null)}>Criar tarefa</Button>}
        />
      ) : view === "today" ? (
        <div className="mt-7 space-y-8">
          {todayGroups
            .filter((group) => group.tasks.length)
            .map((group) => (
              <section key={group.title}>
                <div className="mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em]">
                    {group.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
                </div>
                <div className="space-y-3">
                  {group.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      project={projects.find((project) => project.id === task.projectId)}
                      onToggle={() => toggle.mutate(task.id)}
                      onEdit={() => setEditing(task)}
                      onRemove={() => remove.mutate(task.id)}
                      onProject={(id) =>
                        navigate({ to: "/projects/$projectId", params: { projectId: id } })
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              project={projects.find((project) => project.id === task.projectId)}
              onToggle={() => toggle.mutate(task.id)}
              onEdit={() => setEditing(task)}
              onRemove={() => remove.mutate(task.id)}
              onProject={(id) =>
                navigate({ to: "/projects/$projectId", params: { projectId: id } })
              }
            />
          ))}
        </div>
      )}
      <TaskDialog
        key={editing?.id ?? (editing === null ? "new" : "closed")}
        task={editing}
        projects={projects}
        onClose={() => setEditing(undefined)}
        onSaved={() => {
          setEditing(undefined);
          void refresh();
        }}
      />
    </PageShell>
  );
}

function TaskRow({
  task,
  project,
  onToggle,
  onEdit,
  onRemove,
  onProject,
}: {
  task: Task;
  project?: { id: string; title: string };
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onProject: (id: string) => void;
}) {
  return (
    <article className="glass flex min-w-0 items-start gap-3 rounded-2xl p-4">
      <button
        aria-label={task.status === "done" ? "Reabrir tarefa" : "Concluir tarefa"}
        onClick={onToggle}
        className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border"
      >
        {task.status === "done" && <Check className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <h3
          className={task.status === "done" ? "line-through text-muted-foreground" : "font-medium"}
        >
          {task.title}
        </h3>
        {task.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border px-2 py-0.5 capitalize">
            {task.priority ?? "medium"}
          </span>
          <span>{task.due}</span>
          {project && (
            <button
              className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-gold hover:bg-surface-elevated"
              onClick={() => onProject(project.id)}
            >
              {project.title}
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <Button size="icon" variant="ghost" onClick={onEdit} aria-label={`Editar ${task.title}`}>
        <Pencil />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => confirm(`Excluir ${task.title}?`) && onRemove()}
        aria-label={`Excluir ${task.title}`}
      >
        <Trash2 />
      </Button>
    </article>
  );
}

function TaskDialog({
  task,
  projects,
  onClose,
  onSaved,
}: {
  task: Task | null | undefined;
  projects: Array<{ id: string; title: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState(task?.priority ?? "medium");
  const [due, setDue] = useState(task?.dueDate?.slice(0, 10) ?? "");
  const [projectId, setProjectId] = useState(task?.projectId ?? "");
  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("O título é obrigatório");
      const values = {
        title: title.trim(),
        description,
        priority,
        dueDate: due || null,
        projectId: projectId || null,
      };
      if (task)
        await TaskService.updateTask(task.id, {
          title: values.title,
          description,
          priority,
          due_date: values.dueDate,
          project_id: values.projectId,
        });
      else await TaskService.createTask(values);
    },
    onSuccess: () => {
      toast.success(task ? "Tarefa atualizada" : "Tarefa criada");
      onSaved();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <Dialog open={task !== undefined} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="task-description">Descrição</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="task-priority">Prioridade</Label>
              <select
                id="task-priority"
                className="h-11 w-full rounded-md border border-input bg-background px-3"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </div>
            <div>
              <Label htmlFor="task-due">Prazo</Label>
              <Input
                id="task-due"
                type="date"
                value={due}
                onChange={(event) => setDue(event.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="task-project">Projeto</Label>
            <select
              id="task-project"
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={projectId ?? ""}
              onChange={(event) => setProjectId(event.target.value)}
            >
              <option value="">Sem projeto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={!title.trim() || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
