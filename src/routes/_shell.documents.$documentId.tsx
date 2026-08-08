import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DocumentService, workspaceQueryKeys } from "@/services";

export const Route = createFileRoute("/_shell/documents/$documentId")({
  component: DocumentWorkspace,
});

function DocumentWorkspace() {
  const { documentId } = Route.useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: [...workspaceQueryKeys.documents, documentId],
    queryFn: () => DocumentService.get(documentId),
  });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [dirty, setDirty] = useState(false);
  const hydrated = useRef(false);
  useEffect(() => {
    if (query.data && !hydrated.current) {
      setTitle(query.data.title);
      setContent(query.data.summary);
      setDirty(false);
      hydrated.current = true;
    }
  }, [query.data]);
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: workspaceQueryKeys.documents }),
      client.invalidateQueries({ queryKey: [...workspaceQueryKeys.documents, documentId] }),
    ]);
  const save = useMutation({
    mutationFn: () => DocumentService.update(documentId, { title: title.trim(), content }),
    onSuccess: async () => {
      await refresh();
      setDirty(false);
      toast.success("Document saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const analyze = useMutation({
    mutationFn: (instruction: string) => DocumentService.analyze(documentId, instruction),
    onSuccess: (result) => setAnalysis(result.content),
    onError: (e: Error) => toast.error(e.message),
  });
  if (query.isLoading)
    return (
      <PageShell>
        <p>Loading document…</p>
      </PageShell>
    );
  if (!query.data)
    return (
      <PageShell>
        <EmptyState
          icon={Trash2}
          title="Document not found"
          description="It does not exist or does not belong to you."
        />
      </PageShell>
    );
  const document = query.data;
  return (
    <PageShell>
      <div className="mx-auto max-w-4xl min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => navigate({ to: "/documents" })}>
            <ArrowLeft /> Documents
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={save.isPending || !title.trim()}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const copy = await DocumentService.createUploadRecord(
                  `${title} copy`,
                  document.type,
                  content,
                );
                await refresh();
                navigate({ to: "/documents/$documentId", params: { documentId: copy.id } });
              }}
            >
              <Copy /> Duplicate
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (confirm("Delete this document permanently?")) {
                  await DocumentService.remove(documentId);
                  navigate({ to: "/documents" });
                }
              }}
            >
              <Trash2 /> Delete
            </Button>
          </div>
        </div>
        <Input
          className="mt-6 h-auto border-0 px-0 text-3xl font-semibold shadow-none focus-visible:ring-0"
          aria-label="Document title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
        />
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span aria-live="polite">
            {save.isPending ? "Saving changes…" : dirty ? "Unsaved changes" : "Saved"}
          </span>
          <span>Updated {new Date(document.updatedAt).toLocaleString()}</span>
        </div>
        <Textarea
          className="mt-6 min-h-[55vh] resize-y text-base leading-7"
          aria-label="Document content"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setDirty(true);
          }}
          placeholder="Start writing…"
        />
        <section className="glass mt-6 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">AI document analysis</h2>
              <p className="text-sm text-muted-foreground">
                Premium entitlement is enforced by the backend. Attachments are unavailable because
                files have no document relationship.
              </p>
            </div>
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {[
                ["Summary", "Summarize this document"],
                ["Key points", "List the key points"],
                ["Questions", "Create study questions"],
                ["Explain", "Explain this document clearly"],
              ].map(([label, instruction]) => (
                <Button
                  key={label}
                  size="sm"
                  variant="outline"
                  disabled={analyze.isPending || !content.trim()}
                  onClick={() => analyze.mutate(instruction)}
                >
                  <Sparkles />
                  {label}
                </Button>
              ))}
            </div>
          </div>
          {analyze.isPending && <p className="mt-4 text-sm">Analyzing…</p>}
          {analysis && (
            <div className="mt-4 whitespace-pre-wrap rounded-xl bg-background/60 p-4 text-sm">
              {analysis}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
