import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ContentService, workspaceQueryKeys } from "@/services";
import { useAuth } from "@/lib/auth-context";
export const Route = createFileRoute("/_shell/content/$contentId")({ component: Workspace });
const operations = ["rewrite", "summarize", "expand", "tone", "title"] as const;
function Workspace() {
  const { contentId } = Route.useParams();
  const nav = useNavigate();
  const client = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const contentKey = workspaceQueryKeys.content(user?.id);
  const q = useQuery({
    queryKey: [...contentKey, contentId],
    queryFn: () => ContentService.getDraft(contentId),
    enabled: isAuthenticated && !!user,
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const hydrated = useRef(false);
  useEffect(() => {
    if (q.data && !hydrated.current) {
      setTitle(q.data.title);
      setBody(q.data.body);
      hydrated.current = true;
    }
  }, [q.data]);
  const refresh = () => client.invalidateQueries({ queryKey: contentKey });
  const save = useMutation({
    mutationFn: () => ContentService.updateDraft(contentId, { title: title.trim(), body }),
    onSuccess: async () => {
      await refresh();
      toast.success("Draft saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const ai = useMutation({
    mutationFn: (operation: (typeof operations)[number]) =>
      ContentService.generate({ operation, text: body, title }),
    onSuccess: (r) => {
      if (
        confirm(
          "Replace the editor with the AI result? Your current draft remains unchanged until you save.",
        )
      )
        setBody(r.content);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (q.isLoading)
    return (
      <PageShell>
        <p>Loading draft…</p>
      </PageShell>
    );
  if (q.isError)
    return (
      <PageShell>
        <div
          className="mx-auto mt-12 max-w-xl rounded-2xl border border-destructive/30 bg-destructive/5 p-6"
          role="alert"
        >
          <h1 className="text-xl font-semibold">We couldn't open this draft.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your content remains saved. Check your connection and try again.
          </p>
          <Button className="mt-4" onClick={() => q.refetch()}>
            Try again
          </Button>
        </div>
      </PageShell>
    );
  if (!q.data)
    return (
      <PageShell>
        <EmptyState
          icon={Trash2}
          title="Draft not found"
          description="It does not exist or does not belong to you."
        />
      </PageShell>
    );
  return (
    <PageShell>
      <div className="mx-auto max-w-5xl min-w-0">
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="ghost" onClick={() => nav({ to: "/content" })}>
            <ArrowLeft />
            Content
          </Button>
          <div className="flex gap-2">
            <Button disabled={save.isPending || !title.trim()} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const d = await ContentService.createDraft({ title: `${title} copy`, body });
                await refresh();
                nav({ to: "/content/$contentId", params: { contentId: d.id } });
              }}
            >
              <Copy />
              Duplicate
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (confirm("Delete this draft?")) {
                  await ContentService.removeDraft(contentId);
                  nav({ to: "/content" });
                }
              }}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
        <Input
          className="mt-6 h-auto border-0 px-0 text-3xl font-semibold shadow-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-2">
          {operations.map((op) => (
            <Button
              className="shrink-0"
              variant="outline"
              key={op}
              disabled={ai.isPending || !body.trim()}
              onClick={() => ai.mutate(op)}
            >
              <Sparkles />
              {op}
            </Button>
          ))}
        </div>
        <Textarea
          className="min-h-[60vh] text-base leading-7"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write or generate content…"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          AI limits and entitlement are enforced by the backend. AI output only replaces text after
          confirmation.
        </p>
      </div>
    </PageShell>
  );
}
