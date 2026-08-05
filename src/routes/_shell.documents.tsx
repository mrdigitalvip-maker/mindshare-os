import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { DocumentService, type Document } from "@/services";

export const Route = createFileRoute("/_shell/documents")({
  head: () => ({ meta: [{ title: "Documents — NEXORA" }] }),
  component: Documents,
});

function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    void DocumentService.list()
      .then(setDocuments)
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Unable to load data");
      });
  }, []);

  async function addDoc() {
    try {
      const created = await DocumentService.createUploadRecord();
      setDocuments((current) => [created, ...current]);
      toast.success("Document added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add document");
    }
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
