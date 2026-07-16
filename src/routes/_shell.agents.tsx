import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Plus, Crown } from "lucide-react";
import { PageShell, PageHeader, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_shell/agents")({
  head: () => ({ meta: [{ title: "Agents — NEXORA" }] }),
  component: () => (
    <PageShell>
      <PageHeader
        eyebrow="Premium module"
        title="Agents"
        description="Build AI workers that run tasks for you, on schedule."
        actions={
          <Link to="/premium">
            <Button className="rounded-full">
              <Crown className="mr-1 h-4 w-4" /> Unlock with Pro
            </Button>
          </Link>
        }
      />
      <div className="mt-10">
        <EmptyState
          icon={Bot}
          title="No agents yet"
          description="Create custom AI agents that read your data, watch triggers and act autonomously."
          action={
            <Button className="rounded-full" disabled>
              <Plus className="mr-1 h-4 w-4" /> New agent
            </Button>
          }
        />
      </div>
    </PageShell>
  ),
});
