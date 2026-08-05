import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, BookOpen, Brain, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-workspace";
import { makeWorkspaceId } from "@/lib/workspace-service";

export const Route = createFileRoute("/_shell/studies")({
  head: () => ({ meta: [{ title: "Studies — NEXORA" }] }),
  component: Studies,
});
function Studies() {
  const { state, update } = useWorkspace();
  function add() {
    update((s) => ({
      ...s,
      studies: [
        {
          id: makeWorkspaceId("study"),
          title: `Study plan ${s.studies.length + 1}`,
          progress: 0,
          nextSession: "Tomorrow, 09:00",
        },
        ...s.studies,
      ],
    }));
    toast.success("Study plan created");
  }
  return (
    <PageShell>
      <PageHeader
        eyebrow="Modules"
        title="Studies"
        description="Learn faster with AI-guided study sessions."
        actions={
          <Button className="rounded-full" onClick={add}>
            <Plus className="mr-1 h-4 w-4" />
            New plan
          </Button>
        }
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { icon: BookOpen, title: "Study plans", copy: `${state.studies.length} active` },
          { icon: Brain, title: "Flashcards", copy: "Smart spaced repetition" },
          {
            icon: GraduationCap,
            title: "Progress",
            copy: `${Math.round(state.studies.reduce((a, s) => a + s.progress, 0) / Math.max(state.studies.length, 1))}% average`,
          },
        ].map((c) => (
          <div key={c.title} className="glass rounded-2xl p-6">
            <c.icon className="h-5 w-5 text-gold" />
            <h3 className="mt-3 font-display text-xl">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.copy}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {state.studies.map((s) => (
          <article key={s.id} className="glass rounded-2xl p-5">
            <h3 className="font-display text-xl">{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Next session: {s.nextSession}</p>
            <div className="mt-4 h-2 rounded-full bg-surface">
              <div className="h-full rounded-full bg-gold" style={{ width: `${s.progress}%` }} />
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
