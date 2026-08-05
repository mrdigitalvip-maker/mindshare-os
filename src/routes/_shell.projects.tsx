import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-workspace";
import { makeWorkspaceId, nextProjectColor } from "@/lib/workspace-service";

export const Route = createFileRoute("/_shell/projects")({
  head: () => ({ meta: [{ title: "Projects — NEXORA" }] }),
  component: Projects,
});

function Projects() {
  const { state, update } = useWorkspace();
  function addProject() {
    const title = `New project ${state.projects.length + 1}`;
    update((s) => ({
      ...s,
      projects: [
        {
          id: makeWorkspaceId("project"),
          title,
          progress: 0,
          color: nextProjectColor(s.projects.length),
          updatedAt: new Date().toISOString(),
        },
        ...s.projects,
      ],
    }));
    toast.success("Project created");
  }
  return (
    <PageShell>
      <PageHeader
        eyebrow="Modules"
        title="Projects"
        description="Plan, ship and reflect on the work that matters."
        actions={
          <Button className="rounded-full" onClick={addProject}>
            <Plus className="mr-1 h-4 w-4" /> New project
          </Button>
        }
      />
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.projects.map((p) => (
          <article key={p.id} className="glass rounded-2xl p-6">
            <div className={`h-2 w-16 rounded-full ${p.color}`} />
            <h3 className="mt-4 font-display text-xl">{p.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Updated {new Date(p.updatedAt).toLocaleDateString()}
            </p>
            <div className="mt-5 h-2 rounded-full bg-surface">
              <div className="h-full rounded-full bg-gold" style={{ width: `${p.progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{p.progress}% complete</p>
          </article>
        ))}
        <button
          onClick={addProject}
          className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-muted-foreground transition hover:text-foreground"
        >
          <FolderKanban className="h-8 w-8" />
          <span className="mt-3 text-sm">Create project</span>
        </button>
      </div>
    </PageShell>
  );
}
