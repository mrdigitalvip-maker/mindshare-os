import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProjectService, type Project } from "@/services";
export const Route = createFileRoute("/_shell/projects")({
  head: () => ({ meta: [{ title: "Projects — NEXORA" }] }),
  component: Projects,
});
const key = ["workspace", "projects"] as const;
function Projects() {
  const client = useQueryClient();
  const [editing, setEditing] = useState<Project | null | undefined>();
  const query = useQuery({ queryKey: key, queryFn: () => ProjectService.list() });
  const refresh = () => client.invalidateQueries({ queryKey: key });
  const remove = useMutation({
    mutationFn: (id: string) => ProjectService.remove(id),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <PageShell>
      <PageHeader
        eyebrow="Modules"
        title="Projects"
        description="Plan work and track progress calculated from associated tasks."
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus /> New project
          </Button>
        }
      />
      {query.isLoading ? (
        <p className="mt-10 text-center text-muted-foreground">Loading projects…</p>
      ) : query.isError ? (
        <EmptyState
          icon={FolderKanban}
          title="Projects unavailable"
          description={(query.error as Error).message}
        />
      ) : !query.data?.length ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project, then associate tasks from Productivity."
          action={<Button onClick={() => setEditing(null)}>Create project</Button>}
        />
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {query.data.map((project) => (
            <article key={project.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {project.status}
                  </span>
                  <h2 className="mt-1 truncate font-display text-xl">{project.title}</h2>
                </div>
                <div className="flex">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(project)}
                    aria-label={`Edit ${project.title}`}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => confirm(`Delete ${project.title}?`) && remove.mutate(project.id)}
                    aria-label={`Delete ${project.title}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <p className="mt-3 min-h-10 text-sm text-muted-foreground">
                {project.description || "No description"}
              </p>
              <div className="mt-5 h-2 rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-gold"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {project.progress}% from completed tasks · Updated{" "}
                {new Date(project.updatedAt).toLocaleDateString()}
              </p>
            </article>
          ))}
        </div>
      )}
      <ProjectDialog
        project={editing}
        close={() => setEditing(undefined)}
        saved={async () => {
          await refresh();
          setEditing(undefined);
        }}
      />
    </PageShell>
  );
}
function ProjectDialog({
  project,
  close,
  saved,
}: {
  project: Project | null | undefined;
  close: () => void;
  saved: () => void;
}) {
  const [title, setTitle] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState(project?.status ?? "active");
  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Name is required");
      if (project)
        await ProjectService.update(project.id, { title: title.trim(), description, status });
      else await ProjectService.create({ title: title.trim(), description, status });
    },
    onSuccess: () => {
      toast.success(project ? "Project updated" : "Project created");
      saved();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={project !== undefined} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="project-status">Status</Label>
            <select
              id="project-status"
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close}>
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
