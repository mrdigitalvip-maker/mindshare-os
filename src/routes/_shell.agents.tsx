import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Plus, Crown } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-workspace";
import { makeWorkspaceId } from "@/lib/workspace-service";

export const Route = createFileRoute("/_shell/agents")({
  head: () => ({ meta: [{ title: "Agents — NEXORA" }] }),
  component: Agents,
});
function Agents() {
  const { state, update } = useWorkspace();
  function add() {
    update((s) => ({
      ...s,
      agents: [
        {
          id: makeWorkspaceId("agent"),
          title: `AI agent ${s.agents.length + 1}`,
          cadence: "Manual trigger",
          status: "draft",
        },
        ...s.agents,
      ],
    }));
    toast.success("Agent draft created");
  }
  return (
    <PageShell>
      <PageHeader
        eyebrow="Premium module"
        title="Agents"
        description="Build AI workers that run tasks for you, on schedule."
        actions={
          <>
            <Button variant="outline" className="rounded-full" onClick={add}>
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
        {state.agents.map((a) => (
          <article key={a.id} className="glass rounded-2xl p-6">
            <Bot className="h-5 w-5 text-gold" />
            <h3 className="mt-3 font-display text-xl">{a.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{a.cadence}</p>
            <span className="mt-4 inline-flex rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
              {a.status}
            </span>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
