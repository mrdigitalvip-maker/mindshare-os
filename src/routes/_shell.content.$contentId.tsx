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
import { useLanguage } from "@/providers/language-provider";
export const Route = createFileRoute("/_shell/content/$contentId")({ component: Workspace });
const operations = ["rewrite", "summarize", "expand", "tone", "title"] as const;
function Workspace() {
  const { resolvedLocale } = useLanguage();
  const L = (pt: string, en: string) => (resolvedLocale === "pt-BR" ? pt : en);
  const operationLabel = (value: (typeof operations)[number]) =>
    ({
      rewrite: L("reescrever", "rewrite"),
      summarize: L("resumir", "summarize"),
      expand: L("expandir", "expand"),
      tone: L("ajustar tom", "tone"),
      title: L("título", "title"),
    })[value];
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
  const [dirty, setDirty] = useState(false);
  const hydrated = useRef(false);
  useEffect(() => {
    if (q.data && !hydrated.current) {
      setTitle(q.data.title);
      setBody(q.data.body);
      setDirty(false);
      hydrated.current = true;
    }
  }, [q.data]);
  const refresh = () => client.invalidateQueries({ queryKey: contentKey });
  const save = useMutation({
    mutationFn: () => ContentService.updateDraft(contentId, { title: title.trim(), body }),
    onSuccess: async () => {
      await refresh();
      setDirty(false);
      toast.success(L("Rascunho salvo", "Draft saved"));
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const ai = useMutation({
    mutationFn: (operation: (typeof operations)[number]) =>
      ContentService.generate({ operation, text: body, title }),
    onSuccess: (r) => {
      if (
        confirm(
          L("Substituir o editor pelo resultado da IA? Seu rascunho atual permanece inalterado até você salvar.", "Replace the editor with the AI result? Your current draft remains unchanged until you save."),
        )
      ) {
        setBody(r.content);
        setDirty(true);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (q.isLoading)
    return (
      <PageShell>
        <p>{L("Carregando rascunho…", "Loading draft…")}</p>
      </PageShell>
    );
  if (q.isError)
    return (
      <PageShell>
        <div
          className="mx-auto mt-12 max-w-xl rounded-2xl border border-destructive/30 bg-destructive/5 p-6"
          role="alert"
        >
          <h1 className="text-xl font-semibold">{L("Não foi possível abrir este rascunho.", "We couldn't open this draft.")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {L("Seu conteúdo continua salvo. Verifique a conexão e tente novamente.", "Your content remains saved. Check your connection and try again.")}
          </p>
          <Button className="mt-4" onClick={() => q.refetch()}>
            {L("Tentar novamente", "Try again")}
          </Button>
        </div>
      </PageShell>
    );
  if (!q.data)
    return (
      <PageShell>
        <EmptyState
          icon={Trash2}
          title={L("Rascunho não encontrado", "Draft not found")}
          description={L("Ele não existe ou não pertence a você.", "It does not exist or does not belong to you.")}
        />
      </PageShell>
    );
  return (
    <PageShell>
      <div className="mx-auto max-w-5xl min-w-0 pb-[env(safe-area-inset-bottom)]">
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="ghost" onClick={() => nav({ to: "/content" })}>
            <ArrowLeft />
            {L("Conteúdo", "Content")}
          </Button>
          <div className="flex gap-2">
            <Button disabled={save.isPending || !title.trim()} onClick={() => save.mutate()}>
              {save.isPending ? L("Salvando…", "Saving…") : L("Salvar", "Save")}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const d = await ContentService.createDraft({ title: `${title} ${L("cópia", "copy")}`, body });
                await refresh();
                nav({ to: "/content/$contentId", params: { contentId: d.id } });
              }}
            >
              <Copy />
              {L("Duplicar", "Duplicate")}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (confirm(L("Excluir este rascunho?", "Delete this draft?"))) {
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
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex gap-2">
            <strong className="text-foreground">{L("IDEIA", "IDEA")}</strong>
            <span>→</span>
            <strong className="text-foreground">{L("RASCUNHO", "DRAFT")}</strong>
            <span>→</span>
            <strong className="text-foreground">{L("MELHORAR", "IMPROVE")}</strong>
            <span>→</span>
            <strong className="text-foreground">{L("FINAL", "FINAL")}</strong>
          </div>
          <span aria-live="polite">
            {save.isPending
              ? L("Salvando…", "Saving…")
              : dirty
                ? L("Alterações não salvas", "Unsaved changes")
                : `${L("Salvo", "Saved")}${q.data.updatedAt ? ` · ${new Date(q.data.updatedAt).toLocaleString(resolvedLocale)}` : ""}`}
          </span>
        </div>
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
              {operationLabel(op)}
            </Button>
          ))}
        </div>
        <Textarea
          className="min-h-[60vh] text-base leading-7"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setDirty(true);
          }}
          placeholder={L("Escreva ou gere conteúdo…", "Write or generate content…")}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {L("Limites e entitlement de IA são aplicados pelo backend. A saída da IA só substitui o texto após confirmação.", "AI limits and entitlement are enforced by the backend. AI output only replaces text after confirmation.")}
        </p>
      </div>
    </PageShell>
  );
}
