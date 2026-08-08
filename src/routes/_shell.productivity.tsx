import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProductivityService, workspaceQueryKeys, type Task } from "@/services";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_shell/productivity")({
  head: () => ({ meta: [{ title: "Produtividade — NEXORA" }] }),
  component: Produtividade,
});
type View = "inbox" | "today" | "upcoming" | "overdue" | "done";

function Produtividade() {
  const client = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const key = workspaceQueryKeys.tasks(user?.id);
  const [view, setView] = useState<View>("inbox");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Task | null | undefined>(undefined);
  const query = useQuery({
    queryKey: key,
    queryFn: () => ProductivityService.listTasks(),
    enabled: isAuthenticated && !!user,
  });
  const invalidate = () => client.invalidateQueries({ queryKey: key });
  const toggle = useMutation({
    mutationFn: (id: string) => ProductivityService.toggleTask(id),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => ProductivityService.removeTask(id),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const tasks = useMemo(
    () =>
      (query.data ?? []).filter((task) => {
        const match = `${task.title} ${task.description ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const today = task.dueDate
          ? new Date(task.dueDate).toDateString() === new Date().toDateString()
          : false;
        return (
          match &&
          (view === "inbox" ||
            (view === "today" && today) ||
            (view === "upcoming" &&
              task.status === "open" &&
              !!task.dueDate &&
              new Date(task.dueDate) > new Date()) ||
            (view === "overdue" &&
              task.status === "open" &&
              !!task.dueDate &&
              new Date(task.dueDate) < new Date()) ||
            (view === "done" && task.status === "done"))
        );
      }),
    [query.data, search, view],
  );
  return (
    <PageShell>
      <PageHeader
        eyebrow="Organização"
        title="Produtividade"
        description="Capture, priorize e conclua tarefas reais."
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus /> Nova tarefa
          </Button>
        }
      />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarefas"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {(["inbox", "today", "upcoming", "overdue", "done"] as View[]).map((v) => (
            <Button
              key={v}
              size="sm"
              variant={view === v ? "default" : "outline"}
              onClick={() => setView(v)}
              className="capitalize"
            >
              {
                {
                  inbox: "Caixa de entrada",
                  today: "Hoje",
                  upcoming: "Próximas",
                  overdue: "Atrasadas",
                  done: "Concluídas",
                }[v]
              }
            </Button>
          ))}
        </div>
      </div>
      {query.isLoading ? (
        <p className="mt-10 text-center text-muted-foreground">Carregando tarefas…</p>
      ) : query.isError ? (
        <EmptyState
          icon={Search}
          title="Tarefas indisponíveis"
          description={(query.error as Error).message}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={Check}
          title="Nenhuma tarefa aqui"
          description="Crie uma tarefa ou ajuste os filtros."
          action={<Button onClick={() => setEditing(null)}>Criar tarefa</Button>}
        />
      ) : (
        <div className="mt-6 space-y-3">
          {tasks.map((task) => (
            <article key={task.id} className="glass flex min-w-0 items-start gap-3 rounded-2xl p-4">
              <button
                aria-label={task.status === "done" ? "Reabrir tarefa" : "Concluir tarefa"}
                onClick={() => toggle.mutate(task.id)}
                className="mt-1 h-6 w-6 shrink-0 rounded-full border border-border"
              >
                {task.status === "done" && <Check className="h-5 w-5" />}
              </button>
              <div className="min-w-0 flex-1">
                <h3
                  className={
                    task.status === "done" ? "line-through text-muted-foreground" : "font-medium"
                  }
                >
                  {task.title}
                </h3>
                {task.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {task.priority ?? "medium"} · {task.due}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setEditing(task)}
                aria-label={`Edit ${task.title}`}
              >
                <Pencil />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (confirm(`Excluir ${task.title}?`)) remove.mutate(task.id);
                }}
                aria-label={`Excluir ${task.title}`}
              >
                <Trash2 />
              </Button>
            </article>
          ))}
        </div>
      )}
      <TaskDialog
        task={editing}
        onClose={() => setEditing(undefined)}
        onSalvard={async () => {
          await invalidate();
          setEditing(undefined);
        }}
      />
    </PageShell>
  );
}
function TaskDialog({
  task,
  onClose,
  onSalvard,
}: {
  task: Task | null | undefined;
  onClose: () => void;
  onSalvard: () => void;
}) {
  const [title, setTítulo] = useState(task?.title ?? "");
  const [description, setDescrição] = useState(task?.description ?? "");
  const [priority, setPrioridade] = useState(task?.priority ?? "medium");
  const [due, setDue] = useState(task?.dueDate?.slice(0, 10) ?? "");
  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("O título é obrigatório");
      if (task)
        await ProductivityService.updateTask(task.id, {
          title: title.trim(),
          description,
          priority,
          due_date: due || null,
        });
      else
        await ProductivityService.createTask({
          title: title.trim(),
          description,
          priority,
          dueDate: due || null,
        });
    },
    onSuccess: () => {
      toast.success(task ? "Tarefa atualizada" : "Tarefa criada");
      onSalvard();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={task !== undefined} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTítulo(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="task-description">Descrição</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescrição(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="task-priority">Prioridade</Label>
              <select
                id="task-priority"
                className="h-11 w-full rounded-md border border-input bg-background px-3"
                value={priority}
                onChange={(e) => setPrioridade(e.target.value)}
              >
                <option>low</option>
                <option>medium</option>
                <option>high</option>
              </select>
            </div>
            <div>
              <Label htmlFor="task-due">Prazo</Label>
              <Input
                id="task-due"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
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
