import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban, Plus } from "lucide-react";
import { PageShell, PageHeader, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_shell/projects")({
  head: () => ({ meta: [{ title: "Projects — NEXORA" }] }),
  component: () => (
    <PageShell>
      <PageHeader
        eyebrow="Modules"
        title="Projects"
        description="Plan, ship and reflect on the work that matters."
        actions={
          <Button className="rounded-full">
            <Plus className="mr-1 h-4 w-4" /> New project
          </Button>
        }
      />
      <div className="mt-10">
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to see boards, milestones and AI-drafted plans appear here."
          action={
            <Button className="rounded-full">
              <Plus className="mr-1 h-4 w-4" /> Create project
            </Button>
          }
        />
      </div>
    </PageShell>
  ),
});
