import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bot, Plus, Crown } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { AgentService, type Agent } from "@/services";

export const Route = createFileRoute("/_shell/agents")({
  head: () => ({ meta: [{ title: "Agents — NEXORA" }] }),
  component: Agents,
});

function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    void AgentService.list()
      .then(setAgents)
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Unable to load data");
      });
  }, []);

  async function addAgent() {
    try {
      const created = await AgentService.createDraft();
      setAgents((current) => [created, ...current]);
      toast.success("Agent draft created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create agent");
    }
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
