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
import { ProductivityService, type Task } from "@/services";

export const Route = createFileRoute("/_shell/productivity")({
  head: () => ({ meta: [{ title: "Productivity — NEXORA" }] }),
  component: Productivity,
});
const key = ["workspace", "tasks"] as const;
type View = "all" | "today" | "open" | "done";

function Productivity() {
  const client = useQueryClient();
  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Task | null | undefined>(undefined);
  const query = useQuery({ queryKey: key, queryFn: () => ProductivityService.listTasks() });
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
          (view === "all" ||
            (view === "today" && today) ||
            (view === "open" && task.status === "open") ||
            (view === "done" && task.status === "done"))
        );
      }),
    [query.data, search, view],
  );
  return (
    <PageShell>
      <PageHeader
        eyebrow="Modules"
        title="Productivity"
        description="Capture, prioritize and complete real tasks."
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus /> New task
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
            placeholder="Search tasks"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {(["all", "today", "open", "done"] as View[]).map((v) => (
            <Button
              key={v}
              size="sm"
              variant={view === v ? "default" : "outline"}
              onClick={() => setView(v)}
              className="capitalize"
            >
              {v}
            </Button>
          ))}
        </div>
      </div>
      {query.isLoading ? (
        <p className="mt-10 text-center text-muted-foreground">Loading tasks…</p>
      ) : query.isError ? (
        <EmptyState
          icon={Search}
          title="Tasks unavailable"
          description={(query.error as Error).message}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={Check}
          title="No tasks here"
          description="Create a task or adjust the filters."
          action={<Button onClick={() => setEditing(null)}>Create task</Button>}
        />
      ) : (
        <div className="mt-6 space-y-3">
          {tasks.map((task) => (
            <article key={task.id} className="glass flex min-w-0 items-start gap-3 rounded-2xl p-4">
              <button
                aria-label={task.status === "done" ? "Reopen task" : "Complete task"}
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
                  if (confirm(`Delete ${task.title}?`)) remove.mutate(task.id);
                }}
                aria-label={`Delete ${task.title}`}
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
        onSaved={async () => {
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
  onSaved,
}: {
  task: Task | null | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState(task?.priority ?? "medium");
  const [due, setDue] = useState(task?.dueDate?.slice(0, 10) ?? "");
  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required");
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
      toast.success(task ? "Task updated" : "Task created");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={task !== undefined} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="task-priority">Priority</Label>
              <select
                id="task-priority"
                className="h-11 w-full rounded-md border border-input bg-background px-3"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option>low</option>
                <option>medium</option>
                <option>high</option>
              </select>
            </div>
            <div>
              <Label htmlFor="task-due">Due date</Label>
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
              Cancel
            </Button>
            <Button disabled={!title.trim() || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
