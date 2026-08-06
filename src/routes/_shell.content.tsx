import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PenLine, Wand2, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { ContentService, type ContentDraft } from "@/services";

export const Route = createFileRoute("/_shell/content")({
  head: () => ({ meta: [{ title: "Content — NEXORA" }] }),
  component: Content,
});

function Content() {
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);

  useEffect(() => {
    void ContentService.listDrafts()
      .then(setDrafts)
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Unable to load data");
      });
  }, []);

  async function addDraft() {
    try {
      const created = await ContentService.createDraft();
      setDrafts((current) => [created, ...current]);
      toast.success("Draft created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create draft");
    }
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
