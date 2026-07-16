import { createFileRoute } from "@tanstack/react-router";
import { ListChecks, Plus, Calendar, Timer } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_shell/productivity")({
  head: () => ({ meta: [{ title: "Productivity — NEXORA" }] }),
  component: () => (
    <PageShell>
      <PageHeader
        eyebrow="Modules"
        title="Productivity"
        description="Tasks, focus timers and calendar in one flow."
        actions={
          <Button className="rounded-full">
            <Plus className="mr-1 h-4 w-4" /> New task
          </Button>
        }
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { icon: ListChecks, title: "Tasks", copy: "0 open" },
          { icon: Calendar, title: "Calendar", copy: "No events today" },
          { icon: Timer, title: "Focus", copy: "Start a 25-min block" },
        ].map((c) => (
          <div key={c.title} className="glass rounded-2xl p-6">
            <c.icon className="h-5 w-5 text-gold" />
            <h3 className="mt-3 font-display text-xl">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.copy}</p>
          </div>
        ))}
      </div>
    </PageShell>
  ),
});
