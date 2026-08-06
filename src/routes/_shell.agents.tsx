import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Plus, Crown } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { AgentService, workspaceQueryKeys } from "@/services";

export const Route = createFileRoute("/_shell/agents")({
  head: () => ({ meta: [{ title: "Agents — NEXORA" }] }),
  component: Agents,
});

function Agents() {
  const queryClient = useQueryClient();
  const { data: agents = [] } = useQuery({
    queryKey: workspaceQueryKeys.agents,
    queryFn: () => AgentService.list(),
  });
  const createMutation = useMutation({
    mutationFn: () => AgentService.createDraft(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.agents });
      toast.success("Agent draft created");
    },
    onError: (error: Error) => toast.error(error.message || "Unable to create agent"),
  });

  function addAgent() {
    createMutation.mutate();
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Premium module"
        title="Agents"
        description="Build AI workers that run tasks for you, on schedule."
        actions={
          <>
            <Button variant="outline" className="rounded-full" onClick={addAgent}>
              <Plus className="mr-1 h-4 w-4" /> New agent
            </Button>
            <Link to="/premium">
              <Button className="rounded-full">
                <Crown className="mr-1 h-4 w-4" /> Unlock with Pro
              </Button>
            </Link>
          </>
        }
      />
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <article key={agent.id} className="glass rounded-2xl p-6">
            <Bot className="h-5 w-5 text-gold" />
            <h3 className="mt-3 font-display text-xl">{agent.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{agent.cadence}</p>
            <span className="mt-4 inline-flex rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
              {agent.status}
            </span>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
