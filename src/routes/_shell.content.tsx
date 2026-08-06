import { createFileRoute } from "@tanstack/react-router";
import { PenLine, Wand2, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { ContentService, workspaceQueryKeys } from "@/services";

export const Route = createFileRoute("/_shell/content")({
  head: () => ({ meta: [{ title: "Content — NEXORA" }] }),
  component: Content,
});

function Content() {
  const queryClient = useQueryClient();
  const { data: drafts = [] } = useQuery({
    queryKey: workspaceQueryKeys.content,
    queryFn: () => ContentService.listDrafts(),
  });
  const createMutation = useMutation({
    mutationFn: () => ContentService.createDraft(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.content });
      toast.success("Draft created");
    },
    onError: (error: Error) => toast.error(error.message || "Unable to create draft"),
  });

  function addDraft() {
    createMutation.mutate();
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Modules"
        title="Content"
        description="Draft, edit and publish across formats and channels."
        actions={
          <Button className="rounded-full" onClick={addDraft}>
            <Plus className="mr-1 h-4 w-4" /> New draft
          </Button>
        }
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { icon: PenLine, title: "Drafts", copy: `${drafts.length} saved` },
          { icon: Wand2, title: "Rewrite", copy: "Refine your voice" },
          { icon: FileText, title: "Templates", copy: "Post, email, script" },
        ].map((card) => (
          <div key={card.title} className="glass rounded-2xl p-6">
            <card.icon className="h-5 w-5 text-gold" />
            <h3 className="mt-3 font-display text-xl">{card.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{card.copy}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {drafts.map((draft) => (
          <article key={draft.id} className="glass rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {draft.format}
            </p>
            <h3 className="mt-2 font-display text-xl">{draft.title}</h3>
            <p className="mt-3 text-sm text-muted-foreground">{draft.body}</p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
