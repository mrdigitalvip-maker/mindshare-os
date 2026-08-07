import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectService, TaskService, type Task } from "@/services";
export const Route = createFileRoute("/_shell/projects/$projectId")({
  component: ProjectWorkspace,
});
function ProjectWorkspace() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [task, setTask] = useState<Task | null | undefined>();
  const project = useQuery({
    queryKey: ["workspace", "projects", projectId],
    queryFn: () => ProjectService.get(projectId),
  });
  const tasks = useQuery({
    queryKey: ["workspace", "tasks", projectId],
    queryFn: async () => (await TaskService.listTasks()).filter((t) => t.projectId === projectId),
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["workspace", "projects"] }),
      client.invalidateQueries({ queryKey: ["workspace", "projects", projectId] }),
      client.invalidateQueries({ queryKey: ["workspace", "tasks"] }),
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
          <TabsTrigger value="notes">Notas</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
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
        {[
          ["notes", "Notas", "As notas vinculadas ao projeto aparecerão aqui."],
          ["documents", "Documentos", "Os documentos do projeto aparecerão aqui."],
          ["activity", "Atividade", "Criações e alterações recentes aparecerão aqui."],
        ].map(([v, t, d]) => (
          <TabsContent value={v} key={v}>
            <EmptyState icon={Pencil} title={t} description={d} />
          </TabsContent>
        ))}
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
    </PageShell>
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
