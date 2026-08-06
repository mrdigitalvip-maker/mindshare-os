import { createFileRoute } from "@tanstack/react-router";
import { FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { DocumentService, workspaceQueryKeys } from "@/services";

export const Route = createFileRoute("/_shell/documents")({
  head: () => ({ meta: [{ title: "Documents — NEXORA" }] }),
  component: Documents,
});

function Documents() {
  const queryClient = useQueryClient();
  const { data: documents = [] } = useQuery({
    queryKey: workspaceQueryKeys.documents,
    queryFn: () => DocumentService.list(),
  });
  const createMutation = useMutation({
    mutationFn: () => DocumentService.createUploadRecord(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.documents });
      toast.success("Document added");
    },
    onError: (error: Error) => toast.error(error.message || "Unable to add document"),
  });

  function addDoc() {
    createMutation.mutate();
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
        {documents.map((document) => (
          <article key={document.id} className="glass rounded-2xl p-6">
            <FileText className="h-5 w-5 text-gold" />
            <h3 className="mt-3 font-display text-xl">{document.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {document.type} · {new Date(document.updatedAt).toLocaleDateString()}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">{document.summary}</p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
