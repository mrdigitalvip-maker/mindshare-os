import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/providers/language-provider";
import { ProjectService, TaskService, workspaceQueryKeys, type Task } from "@/services";
import { useAuth } from "@/lib/auth-context";
import { workspaceMutationError } from "@/lib/mutation-errors";

export const Route = createFileRoute("/_shell/productivity")({
  head: () => ({ meta: [{ title: "Tarefas — KIVRYN" }] }),
  component: Productivity,
});

type View = "today" | "upcoming" | "done" | "all";

const copy = {
  "pt-BR": {
    title: "Tarefas",
    newTask: "Nova tarefa",
    search: "Pesquisar tarefas",
    create: "Criar uma tarefa",
    add: "Adicionar",
    loading: "Carregando tarefas…",
    error: "Não foi possível carregar suas tarefas.",
    empty: "Nenhuma tarefa aqui.",
    emptyHint: "Crie uma tarefa ou escolha outra lista.",
    start: "Comece agora",
    startHint: "Crie uma primeira tarefa útil com um toque.",
    filters: { today: "Hoje", upcoming: "Próximas", done: "Concluídas", all: "Tudo" },
    templates: [
      ["Definir minha prioridade de hoje", "Escolha o resultado mais importante para concluir hoje."],
      ["Revisar meu projeto principal", "Abra o projeto mais importante e defina a próxima ação."],
      ["Organizar minha próxima ação", "Transforme algo pendente em uma ação clara e executável."],
    ],
    edit: "Editar tarefa",
    delete: "Excluir tarefa",
    description: "Descrição (opcional)",
    due: "Prazo",
    priority: "Prioridade",
    project: "Projeto",
    noProject: "Sem projeto",
    high: "Alta",
    medium: "Média",
    low: "Baixa",
    save: "Salvar",
    cancel: "Cancelar",
    created: "Tarefa criada",
    updated: "Tarefa atualizada",
    overdue: "Atrasada",
    today: "Hoje",
    noDate: "Sem prazo",
  },
  en: {
    title: "Tasks",
    newTask: "New task",
    search: "Search tasks",
    create: "Create a task",
    add: "Add",
    loading: "Loading tasks…",
    error: "We couldn't load your tasks.",
    empty: "No tasks here.",
    emptyHint: "Create a task or choose another list.",
    start: "Start now",
    startHint: "Create a useful first task with one tap.",
    filters: { today: "Today", upcoming: "Upcoming", done: "Completed", all: "All" },
    templates: [
      ["Set my priority for today", "Choose the most important result to finish today."],
      ["Review my main project", "Open the most important project and define its next action."],
      ["Organize my next action", "Turn something pending into a clear, executable action."],
    ],
    edit: "Edit task",
    delete: "Delete task",
    description: "Description (optional)",
    due: "Due date",
    priority: "Priority",
    project: "Project",
    noProject: "No project",
    high: "High",
    medium: "Medium",
    low: "Low",
    save: "Save",
    cancel: "Cancel",
    created: "Task created",
    updated: "Task updated",
    overdue: "Overdue",
    today: "Today",
    noDate: "No due date",
  },
} as const;

const localDay = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const dueKey = (value?: string | null) => (value ? value.slice(0, 10) : null);
const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };

function Productivity() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const client = useQueryClient();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const tasksKey = workspaceQueryKeys.tasks(user?.id);
  const projectsKey = workspaceQueryKeys.projects(user?.id);
  const [view, setView] = useState<View>("today");
  const [search, setSearch] = useState("");
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
    onError: (error: unknown) => toast.error(workspaceMutationError(error).message),
  });
  const remove = useMutation({
    mutationFn: TaskService.removeTask,
    onSuccess: () => void refresh(),
    onError: (error: unknown) => toast.error(workspaceMutationError(error).message),
  });
  const quickAdd = useMutation({
    mutationFn: (title: string) =>
      TaskService.createTask({ title: title.trim(), priority: "medium", dueDate: null }),
    onSuccess: () => {
      setQuickTitle("");
      setView("all");
      toast.success(text.created);
      void refresh();
    },
    onError: (error: unknown) => toast.error(workspaceMutationError(error).message),
  });

  const projects = Array.isArray(projectsQuery.data) ? projectsQuery.data : [];
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const today = localDay();
  const allTasks = Array.isArray(tasksQuery.data) ? tasksQuery.data : [];
  const tasks = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allTasks
      .filter((task) => {
        const due = dueKey(task.dueDate);
        const matchesSearch = `${task.title} ${task.description ?? ""} ${projectById.get(task.projectId ?? "")?.title ?? ""}`
          .toLowerCase()
          .includes(needle);
        const matchesView =
          (view === "today" && task.status === "open" && !!due && due <= today) ||
          (view === "upcoming" && task.status === "open" && !!due && due > today) ||
          (view === "done" && task.status === "done") ||
          view === "all";
        return matchesSearch && matchesView;
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "open" ? -1 : 1;
        const dueA = dueKey(a.dueDate) ?? "9999-12-31";
        const dueB = dueKey(b.dueDate) ?? "9999-12-31";
        if (dueA !== dueB) return dueA.localeCompare(dueB);
        return (priorityRank[a.priority ?? "medium"] ?? 1) - (priorityRank[b.priority ?? "medium"] ?? 1);
      });
  }, [allTasks, projectById, search, today, view]);

  function submitQuick(title = quickTitle) {
    if (!title.trim() || quickAdd.isPending) return;
    quickAdd.mutate(title);
  }

  return (
    <PageShell>
      <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-4xl flex-col pb-4">
        <header className="flex items-center justify-between gap-4 py-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{text.title}</h1>
          <Button size="icon" variant="outline" className="rounded-full" onClick={() => setEditing(null)} aria-label={text.newTask}>
            <Plus />
          </Button>
        </header>

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label={text.title}>
          {(Object.keys(text.filters) as View[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                view === item
                  ? "bg-foreground text-background"
                  : "border border-border bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              {text.filters[item]}
            </button>
          ))}
        </nav>

        <div className="relative mt-4">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={text.search}
            className="h-12 rounded-full border-border bg-surface pl-11"
          />
        </div>

        <section className="mt-7 flex-1">
          {tasksQuery.isLoading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{text.loading}</p>
          ) : tasksQuery.isError ? (
            <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
              {text.error}
            </div>
          ) : allTasks.length === 0 ? (
            <div>
              <div className="mb-5">
                <h2 className="text-xl font-semibold">{text.start}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{text.startHint}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {text.templates.map(([title, description]) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => submitQuick(title)}
                    className="min-h-40 rounded-3xl border border-dashed border-border bg-surface/40 p-5 text-left transition hover:border-foreground/25 hover:bg-surface"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <strong className="text-base leading-6">{title}</strong>
                      <Plus className="h-5 w-5 shrink-0 text-muted-foreground" />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-3xl border border-border bg-surface/50 px-6 py-12 text-center">
              <Check className="mx-auto h-6 w-6 text-muted-foreground" />
              <h2 className="mt-4 font-medium">{text.empty}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text.emptyHint}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  project={projectById.get(task.projectId ?? "")}
                  locale={resolvedLocale}
                  labels={text}
                  pending={toggle.isPending || remove.isPending}
                  onToggle={() => toggle.mutate(task.id)}
                  onEdit={() => setEditing(task)}
                  onRemove={() => {
                    if (confirm(`${text.delete}: ${task.title}?`)) remove.mutate(task.id);
                  }}
                  onProject={(id) => navigate({ to: "/projects/$projectId", params: { projectId: id } })}
                />
              ))}
            </div>
          )}
        </section>

        <form
          className="sticky bottom-4 z-20 mt-8 flex items-center gap-2 rounded-[1.75rem] border border-border bg-background/95 p-2 shadow-xl backdrop-blur"
          onSubmit={(event) => {
            event.preventDefault();
            submitQuick();
          }}
        >
          <Input
            aria-label={text.create}
            value={quickTitle}
            onChange={(event) => setQuickTitle(event.target.value)}
            placeholder={text.create}
            className="h-12 flex-1 border-0 bg-transparent px-4 shadow-none focus-visible:ring-0"
          />
          <Button type="submit" size="icon" className="h-11 w-11 rounded-full" disabled={!quickTitle.trim() || quickAdd.isPending} aria-label={text.add}>
            <Plus />
          </Button>
        </form>

        <TaskDialog
          key={editing?.id ?? (editing === null ? "new" : "closed")}
          task={editing}
          projects={projects}
          labels={text}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            void refresh();
          }}
        />
      </main>
    </PageShell>
  );
}

function TaskRow({
  task,
  project,
  locale,
  labels,
  pending,
  onToggle,
  onEdit,
  onRemove,
  onProject,
}: {
  task: Task;
  project?: { id: string; title: string };
  locale: "pt-BR" | "en";
  labels: (typeof copy)["pt-BR"] | (typeof copy)["en"];
  pending: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onProject: (id: string) => void;
}) {
  const due = dueKey(task.dueDate);
  const today = localDay();
  const dueLabel = !due
    ? labels.noDate
    : due < today
      ? labels.overdue
      : due === today
        ? labels.today
        : new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(new Date(`${due}T12:00:00`));
  const priorityLabel = task.priority === "high" ? labels.high : task.priority === "low" ? labels.low : labels.medium;

  return (
    <article className="group flex min-w-0 items-start gap-3 rounded-[1.65rem] border border-border bg-surface px-4 py-4 sm:px-5">
      <button
        type="button"
        disabled={pending}
        aria-label={task.status === "done" ? labels.edit : labels.title}
        onClick={onToggle}
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border transition hover:border-foreground/40"
      >
        {task.status === "done" ? <Check className="h-4 w-4" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <h2 className={`text-base font-semibold leading-6 ${task.status === "done" ? "text-muted-foreground line-through" : ""}`}>
          {task.title}
        </h2>
        {task.description ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{task.description}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{dueLabel}</span>
          <span>·</span>
          <span>{priorityLabel}</span>
          {project ? (
            <>
              <span>·</span>
              <button type="button" className="font-medium text-foreground/80 hover:text-foreground" onClick={() => onProject(project.id)}>
                {project.title}
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-70 transition group-hover:opacity-100">
        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={onEdit} aria-label={labels.edit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={onRemove} aria-label={labels.delete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}

function TaskDialog({
  task,
  projects,
  labels,
  onClose,
  onSaved,
}: {
  task: Task | null | undefined;
  projects: Array<{ id: string; title: string }>;
  labels: (typeof copy)["pt-BR"] | (typeof copy)["en"];
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
      if (!title.trim()) throw new Error(labels.create);
      const values = {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: due || null,
        projectId: projectId || null,
      };
      if (task) {
        await TaskService.updateTask(task.id, {
          title: values.title,
          description: values.description,
          priority,
          due_date: values.dueDate,
          project_id: values.projectId,
        });
      } else {
        await TaskService.createTask(values);
      }
    },
    onSuccess: () => {
      toast.success(task ? labels.updated : labels.created);
      onSaved();
    },
    onError: (error: unknown) => toast.error(workspaceMutationError(error).message),
  });

  return (
    <Dialog open={task !== undefined} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? labels.edit : labels.newTask}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">{labels.title}</Label>
            <Input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus maxLength={160} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">{labels.description}</Label>
            <Textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-due">{labels.due}</Label>
              <Input id="task-due" type="date" value={due} onChange={(event) => setDue(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-priority">{labels.priority}</Label>
              <select id="task-priority" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option value="high">{labels.high}</option>
                <option value="medium">{labels.medium}</option>
                <option value="low">{labels.low}</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-project">{labels.project}</Label>
            <select id="task-project" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">{labels.noProject}</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>{labels.cancel}</Button>
            <Button disabled={!title.trim() || save.isPending} onClick={() => save.mutate()}>{labels.save}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
