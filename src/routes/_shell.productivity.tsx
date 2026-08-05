import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ListChecks, Plus, Calendar, Timer } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { ProductivityService, type Task } from "@/services";

export const Route = createFileRoute("/_shell/productivity")({
  head: () => ({ meta: [{ title: "Productivity — NEXORA" }] }),
  component: Productivity,
});

function Productivity() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const open = tasks.filter((task) => task.status === "open");

  useEffect(() => {
    void ProductivityService.listTasks().then(setTasks);
  }, []);

  async function addTask() {
    const created = await ProductivityService.createTask();
    setTasks((current) => [created, ...current]);
    toast.success("Task added");
  }

  async function toggle(id: string) {
    const updated = await ProductivityService.toggleTask(id);
    setTasks(updated);
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Modules"
        title="Productivity"
        description="Tasks, focus timers and calendar in one flow."
        actions={
          <Button className="rounded-full" onClick={addTask}>
            <Plus className="mr-1 h-4 w-4" /> New task
          </Button>
        }
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { icon: ListChecks, title: "Tasks", copy: `${open.length} open` },
          {
            icon: Calendar,
            title: "Calendar",
            copy: open[0]?.due ? `${open[0].due}: ${open[0].title}` : "No events today",
          },
          { icon: Timer, title: "Focus", copy: `Start a ${open[0]?.focusMinutes ?? 25}-min block` },
        ].map((card) => (
          <div key={card.title} className="glass rounded-2xl p-6">
            <card.icon className="h-5 w-5 text-gold" />
            <h3 className="mt-3 font-display text-xl">{card.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{card.copy}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => void toggle(task.id)}
            className="glass flex w-full items-center justify-between rounded-2xl p-4 text-left"
          >
            <span className={task.status === "done" ? "text-muted-foreground line-through" : ""}>
              {task.title}
            </span>
            <span className="text-xs text-muted-foreground">
              {task.due} · {task.focusMinutes} min
            </span>
          </button>
        ))}
      </div>
    </PageShell>
  );
}
