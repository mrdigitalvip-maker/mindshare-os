import { createFileRoute } from "@tanstack/react-router";
import { FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-workspace";
import { makeWorkspaceId } from "@/lib/workspace-service";

export const Route = createFileRoute("/_shell/documents")({
  head: () => ({ meta: [{ title: "Documents — NEXORA" }] }),
  component: Documents,
});
function Documents() {
  const { state, update } = useWorkspace();
  function addDoc() {
    update((s) => ({
      ...s,
      documents: [
        {
          id: makeWorkspaceId("doc"),
          title: `Uploaded note ${s.documents.length + 1}`,
          type: "Note",
          summary: "Temporary local document record ready for future file processing.",
          updatedAt: new Date().toISOString(),
        },
        ...s.documents,
      ],
    }));
    toast.success("Document added");
  }
  return (
    <PageShell>
      <PageHeader
        eyebrow="Modules"
        title="Documents"
        description="Read, summarize, translate and question any file."
        actions={
          <Button className="rounded-full" onClick={addDoc}>
            <Upload className="mr-1 h-4 w-4" /> Upload
          </Button>
        }
      />
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.documents.map((d) => (
          <article key={d.id} className="glass rounded-2xl p-6">
            <FileText className="h-5 w-5 text-gold" />
            <h3 className="mt-3 font-display text-xl">{d.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {d.type} · {new Date(d.updatedAt).toLocaleDateString()}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">{d.summary}</p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
