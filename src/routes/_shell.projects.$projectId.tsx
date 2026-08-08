import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIService, ProjectService, TaskService, workspaceQueryKeys, type Task } from "@/services";
import { useAuth } from "@/lib/auth-context";
export const Route = createFileRoute("/_shell/projects/$projectId")({
  component: ProjectWorkspace,
});
function ProjectWorkspace() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const projectsKey = workspaceQueryKeys.projects(user?.id);
  const tasksKey = workspaceQueryKeys.tasks(user?.id);
  const [task, setTask] = useState<Task | null | undefined>();
  const [planOpen, setPlanOpen] = useState(false);
  const [planInstruction, setPlanInstruction] = useState(
    "Create an execution plan for this project.",
  );
  const [suggestions, setSuggestions] = useState<Array<{ title: string; selected: boolean }>>([]);
  const project = useQuery({
    queryKey: [...projectsKey, projectId],
    queryFn: () => ProjectService.get(projectId),
    enabled: isAuthenticated && !!user,
  });
  const tasks = useQuery({
    queryKey: [...tasksKey, projectId],
    queryFn: async () => (await TaskService.listTasks()).filter((t) => t.projectId === projectId),
    enabled: isAuthenticated && !!user,
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: projectsKey }),
      client.invalidateQueries({ queryKey: [...projectsKey, projectId] }),
      client.invalidateQueries({ queryKey: tasksKey }),
    ]);
    await tasks.refetch();
  };
  const toggle = useMutation({
    mutationFn: (id: string) => TaskService.toggleTask(id),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => TaskService.removeTask(id),
    onSuccess: refresh,
  });
  const generatePlan = useMutation({
    mutationFn: async () => {
      const result = await AIService.execute("content_generation", {
        operation: "draft",
        title: `Execution plan for ${project.data?.title ?? "project"}`,
        text: [
          "Return ONLY a JSON array of 3 to 8 concise task titles. No markdown or commentary.",
          `Project: ${project.data?.title ?? ""}`,
          `Objective: ${project.data?.objective || project.data?.description || "Not provided"}`,
          `Existing tasks: ${(tasks.data ?? []).map((item) => item.title).join("; ") || "None"}`,
          `Instruction: ${planInstruction.trim()}`,
        ].join("\n"),
      });
      return parseSuggestedTasks(result.content);
    },
    onSuccess: (items) => setSuggestions(items.map((title) => ({ title, selected: true }))),
    onError: (error: Error) => toast.error(error.message || "Could not generate a plan"),
  });
  const confirmPlan = useMutation({
    mutationFn: async () => {
      const selected = suggestions.filter((item) => item.selected && item.title.trim());
      for (const item of selected) {
        await TaskService.createTask({ title: item.title.trim(), projectId });
      }
      return selected.length;
    },
    onSuccess: async (count) => {
      await refresh();
      setPlanOpen(false);
      setSuggestions([]);
      toast.success(`${count} project ${count === 1 ? "task" : "tasks"} created`);
    },
    onError: (error: Error) => toast.error(error.message || "The plan could not be saved"),
  });
  if (project.isLoading)
    return (
      <PageShell>
        <p>Carregando…</p>
      </PageShell>
    );
  if (!project.data)
    return (
      <PageShell>
        <EmptyState
          icon={Trash2}
          title="Projeto não encontrado"
          description="O projeto não existe ou não pertence a você."
        />
      </PageShell>
    );
  const p = project.data;
  return (
    <PageShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Workspace do projeto</p>
          <h1 className="font-display text-3xl">{p.title}</h1>
          <p className="mt-2 text-muted-foreground">{p.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPlanOpen(true)}>
            <Sparkles /> Plan with AI
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const title = prompt("Nome do projeto", p.title);
              if (title) ProjectService.update(p.id, { title }).then(refresh);
            }}
          >
            <Pencil />
            Editar
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (confirm("Excluir este projeto e desvincular suas tarefas?")) {
                await ProjectService.remove(p.id);
                navigate({ to: "/projects" });
              }
            }}
          >
            <Trash2 />
            Excluir
          </Button>
        </div>
      </div>
      <Tabs defaultValue="overview" className="mt-7 min-w-0">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Progresso", `${p.progress}%`],
              ["Abertas", String((p.totalTasks ?? 0) - (p.completedTasks ?? 0))],
              ["Concluídas", String(p.completedTasks ?? 0)],
              ["Prazo", p.dueDate ? new Date(p.dueDate).toLocaleDateString("pt-BR") : "Sem prazo"],
            ].map(([l, v]) => (
              <div className="glass rounded-2xl p-5" key={l}>
                <p className="text-sm text-muted-foreground">{l}</p>
                <p className="mt-2 text-2xl font-semibold">{v}</p>
              </div>
            ))}
          </div>
          <div className="glass mt-4 rounded-2xl p-5">
            <h2 className="font-semibold">Objetivo</h2>
            <p className="mt-2 text-muted-foreground">
              {p.objective || "Nenhum objetivo informado."}
            </p>
            <p className="mt-4 text-sm">
              Status: {p.status} · Prioridade: {p.priority}
            </p>
            <div className="mt-5" aria-label={`Progresso do projeto: ${p.progress}%`}>
              <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                <span>Progresso pelas tarefas</span>
                <span>{p.progress}%</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-surface-elevated"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={p.progress}
              >
                <div
                  className="h-full rounded-full bg-gold transition-[width]"
                  style={{ width: `${p.progress}%` }}
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <div>
                <h3 className="text-sm font-medium">Próxima ação</h3>
                <p className="text-sm text-muted-foreground">
                  {(p.totalTasks ?? 0) > 0
                    ? "Conclua ou ajuste a próxima tarefa aberta."
                    : "Defina a primeira ação executável deste projeto."}
                </p>
              </div>
              <Button onClick={() => setTask(null)}>
                <Plus />
                Adicionar tarefa
              </Button>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="tasks">
          <div className="my-4 flex justify-end">
            <Button onClick={() => setTask(null)}>
              <Plus />
              Nova tarefa
            </Button>
          </div>
          <div className="space-y-3">
            {tasks.data?.map((t) => (
              <article className="glass flex items-center gap-3 rounded-xl p-4" key={t.id}>
                <button onClick={() => toggle.mutate(t.id)} className="h-6 w-6 rounded-full border">
                  {t.status === "done" && <Check />}
                </button>
                <div className="min-w-0 flex-1">
                  <h3 className={t.status === "done" ? "line-through text-muted-foreground" : ""}>
                    {t.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t.priority} · {t.due}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setTask(t)}>
                  <Pencil />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => confirm("Excluir tarefa?") && remove.mutate(t.id)}
                >
                  <Trash2 />
                </Button>
              </article>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      <TaskForm
        task={task}
        projectId={projectId}
        close={() => setTask(undefined)}
        saved={async () => {
          setTask(undefined);
          await refresh();
        }}
      />
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Plan with AI</DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border bg-muted/30 p-4 text-sm">
            <p className="font-medium">{p.title}</p>
            <p className="mt-1 text-muted-foreground">
              {p.objective || p.description || "No objective provided."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {tasks.data?.length ?? 0} existing tasks are included as context.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-instruction">Optional instruction</Label>
            <Textarea
              id="plan-instruction"
              value={planInstruction}
              onChange={(event) => setPlanInstruction(event.target.value)}
            />
          </div>
          <Button
            onClick={() => generatePlan.mutate()}
            disabled={generatePlan.isPending || !planInstruction.trim()}
          >
            {generatePlan.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {suggestions.length ? "Generate again" : "Generate plan preview"}
          </Button>
          {suggestions.length > 0 && (
            <div className="space-y-3" aria-label="Suggested tasks">
              <div>
                <h3 className="font-semibold">Plan preview</h3>
                <p className="text-sm text-muted-foreground">
                  Select, edit or remove tasks. Nothing is saved yet.
                </p>
              </div>
              {suggestions.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    aria-label={`Select task ${index + 1}`}
                    onChange={(event) =>
                      setSuggestions((current) =>
                        current.map((value, i) =>
                          i === index ? { ...value, selected: event.target.checked } : value,
                        ),
                      )
                    }
                  />
                  <Input
                    value={item.title}
                    aria-label={`Task ${index + 1} title`}
                    onChange={(event) =>
                      setSuggestions((current) =>
                        current.map((value, i) =>
                          i === index
                            ? { ...value, title: event.target.value.slice(0, 160) }
                            : value,
                        ),
                      )
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove task ${index + 1}`}
                    onClick={() =>
                      setSuggestions((current) => current.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPlanOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={
                    confirmPlan.isPending ||
                    !suggestions.some((item) => item.selected && item.title.trim())
                  }
                  onClick={() => confirmPlan.mutate()}
                >
                  {confirmPlan.isPending && <Loader2 className="animate-spin" />} Confirm plan
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function parseSuggestedTasks(raw: string): string[] {
  const candidate = raw.match(/\[[\s\S]*\]/)?.[0];
  if (!candidate)
    throw new Error("AI returned no valid task list. Try a more specific instruction.");
  let value: unknown;
  try {
    value = JSON.parse(candidate);
  } catch {
    throw new Error("AI returned an invalid plan. No tasks were created.");
  }
  if (!Array.isArray(value)) throw new Error("AI returned an invalid plan. No tasks were created.");
  const tasks = value
    .filter((item): item is string => typeof item === "string")
    .map((item) =>
      item
        .trim()
        .replace(/^[-*]\s*/, "")
        .slice(0, 160),
    )
    .filter(Boolean)
    .slice(0, 8);
  if (!tasks.length) throw new Error("AI returned no valid tasks. No tasks were created.");
  return [...new Set(tasks)];
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
          title,
          description,
          priority,
          due_date: due || null,
          project_id: projectId,
        });
      else
        await TaskService.createTask({
          title,
          description,
          priority,
          dueDate: due || null,
          projectId,
        });
    },
    onSuccess: () => {
      toast.success("Tarefa salva");
      saved();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={task !== undefined} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          <Label>Descrição</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <select
              className="h-11 rounded-md border bg-background px-3"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <Button
            className="w-full"
            disabled={!title.trim() || save.isPending}
            onClick={() => save.mutate()}
          >
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
