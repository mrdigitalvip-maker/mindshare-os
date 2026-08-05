import { createFileRoute } from "@tanstack/react-router";
import { ListChecks, Plus, Calendar, Timer } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-workspace";
import { makeWorkspaceId } from "@/lib/workspace-service";

export const Route = createFileRoute("/_shell/productivity")({
  head: () => ({ meta: [{ title: "Productivity — NEXORA" }] }),
  component: Productivity,
});
function Productivity() {
  const { state, update } = useWorkspace();
  const open = state.tasks.filter((t) => t.status === "open");
  function addTask() {
    update((s) => ({
      ...s,
      tasks: [
        {
          id: makeWorkspaceId("task"),
          title: `New focus task ${s.tasks.length + 1}`,
          status: "open",
          due: "Today",
          focusMinutes: 25,
        },
        ...s.tasks,
      ],
    }));
    toast.success("Task added");
  }
  function toggle(id: string) {
    update((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, status: t.status === "open" ? "done" : "open" } : t,
      ),
    }));
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
        ].map((c) => (
          <div key={c.title} className="glass rounded-2xl p-6">
            <c.icon className="h-5 w-5 text-gold" />
            <h3 className="mt-3 font-display text-xl">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.copy}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {state.tasks.map((t) => (
          <button
            key={t.id}
            onClick={() => toggle(t.id)}
            className="glass flex w-full items-center justify-between rounded-2xl p-4 text-left"
          >
            <span className={t.status === "done" ? "text-muted-foreground line-through" : ""}>
              {t.title}
            </span>
            <span className="text-xs text-muted-foreground">
              {t.due} · {t.focusMinutes} min
            </span>
          </button>
        ))}
      </div>
    </PageShell>
  );
}
