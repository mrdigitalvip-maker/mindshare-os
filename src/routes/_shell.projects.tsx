import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FolderKanban, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { ProjectService, type Project } from "@/services";

export const Route = createFileRoute("/_shell/projects")({
  head: () => ({ meta: [{ title: "Projects — NEXORA" }] }),
  component: Projects,
});

function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    void ProjectService.list()
      .then(setProjects)
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Unable to load data");
      });
  }, []);

  async function addProject() {
    try {
      const created = await ProjectService.create();
      setProjects((current) => [created, ...current]);
      toast.success("Project created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create project");
    }
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
        {projects.map((project) => (
          <article key={project.id} className="glass rounded-2xl p-6">
            <div className={`h-2 w-16 rounded-full ${project.color}`} />
            <h3 className="mt-4 font-display text-xl">{project.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Updated {new Date(project.updatedAt).toLocaleDateString()}
            </p>
            <div className="mt-5 h-2 rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-gold"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{project.progress}% complete</p>
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
