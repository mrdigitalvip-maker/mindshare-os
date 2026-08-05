import { createFileRoute } from "@tanstack/react-router";
import { PenLine, Wand2, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-workspace";
import { makeWorkspaceId } from "@/lib/workspace-service";

export const Route = createFileRoute("/_shell/content")({
  head: () => ({ meta: [{ title: "Content — NEXORA" }] }),
  component: Content,
});
function Content() {
  const { state, update } = useWorkspace();
  function add() {
    update((s) => ({
      ...s,
      drafts: [
        {
          id: makeWorkspaceId("draft"),
          title: `Draft ${s.drafts.length + 1}`,
          format: "Post",
          body: "A new AI-ready content draft.",
        },
        ...s.drafts,
      ],
    }));
    toast.success("Draft created");
  }
  return (
    <PageShell>
      <PageHeader
        eyebrow="Modules"
        title="Content"
        description="Draft, edit and publish across formats and channels."
        actions={
          <Button className="rounded-full" onClick={add}>
            <Plus className="mr-1 h-4 w-4" />
            New draft
          </Button>
        }
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { icon: PenLine, title: "Drafts", copy: `${state.drafts.length} saved` },
          { icon: Wand2, title: "Rewrite", copy: "Refine your voice" },
          { icon: FileText, title: "Templates", copy: "Post, email, script" },
        ].map((c) => (
          <div key={c.title} className="glass rounded-2xl p-6">
            <c.icon className="h-5 w-5 text-gold" />
            <h3 className="mt-3 font-display text-xl">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.copy}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {state.drafts.map((d) => (
          <article key={d.id} className="glass rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{d.format}</p>
            <h3 className="mt-2 font-display text-xl">{d.title}</h3>
            <p className="mt-3 text-sm text-muted-foreground">{d.body}</p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
