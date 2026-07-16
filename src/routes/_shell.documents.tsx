import { createFileRoute } from "@tanstack/react-router";
import { FileText, Upload } from "lucide-react";
import { PageShell, PageHeader, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_shell/documents")({
  head: () => ({ meta: [{ title: "Documents — NEXORA" }] }),
  component: () => (
    <PageShell>
      <PageHeader
        eyebrow="Modules"
        title="Documents"
        description="Read, summarize, translate and question any file."
        actions={
          <Button className="rounded-full">
            <Upload className="mr-1 h-4 w-4" /> Upload
          </Button>
        }
      />
      <div className="mt-10">
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Drop a PDF, DOCX or TXT and NEXORA will read, summarize and let you chat with it."
          action={
            <Button className="rounded-full">
              <Upload className="mr-1 h-4 w-4" /> Upload a document
            </Button>
          }
        />
      </div>
    </PageShell>
  ),
});
