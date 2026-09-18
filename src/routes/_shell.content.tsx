import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContentService, workspaceQueryKeys } from "@/services";
import { useAuth } from "@/lib/auth-context";
import { WorkspaceShell } from "@/components/workspace-ui";
import { useLanguage } from "@/providers/language-provider";
export const Route = createFileRoute("/_shell/content")({ component: ContentRoute });
const formats = ["Social Post", "Email", "Article", "Script", "Ad Copy", "Description"];
function ContentRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname !== "/content" && pathname !== "/content/" ? <Outlet /> : <ContentIndex />;
}

function ContentIndex() {
  const { resolvedLocale } = useLanguage();
  const L = (pt: string, en: string) => (resolvedLocale === "pt-BR" ? pt : en);
  const navigate = useNavigate();
  const client = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const contentKey = workspaceQueryKeys.content(user?.id);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const drafts = useQuery({
    queryKey: contentKey,
    queryFn: ContentService.listDrafts,
    enabled: isAuthenticated && !!user,
  });
  const visible = useMemo(
    () =>
      (drafts.data ?? []).filter((d) =>
        `${d.title} ${d.body}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [drafts.data, search],
  );
  return (
    <PageShell>
      <WorkspaceShell>
        <PageHeader
          eyebrow={L("Espaço editorial", "Editorial workspace")}
          title={L("Estúdio de Conteúdo", "Content Studio")}
          description={L("Crie, gere e refine rascunhos sem perder o original.", "Create, generate and refine drafts without losing your original.")}
          actions={
            <Button onClick={() => setOpen(true)}>
              <Plus />
              {L("Criar conteúdo", "Create content")}
            </Button>
          }
        />
        <div className="relative mt-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={L("Buscar rascunhos", "Search drafts")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {drafts.isLoading ? (
          <div
            className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            aria-label="Loading drafts"
          >
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-2xl border bg-muted/30 motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : drafts.isError ? (
          <div
            className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6"
            role="alert"
          >
            <h2 className="text-lg font-semibold">{L("Não foi possível carregar seu conteúdo.", "We couldn't load your content.")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {L("Seus rascunhos salvos não foram alterados. Verifique a conexão e tente novamente.", "Your saved drafts are unchanged. Check your connection and try again.")}
            </p>
            <Button className="mt-4" variant="outline" onClick={() => drafts.refetch()}>
              {L("Tentar novamente", "Try again")}
            </Button>
          </div>
        ) : !visible.length ? (
          <EmptyState
            icon={FileText}
            title={L("Nenhum rascunho encontrado", "No drafts found")}
            description={L("Crie um rascunho estruturado para abrir o espaço editorial.", "Create a structured draft to open the editorial workspace.")}
            action={<Button onClick={() => setOpen(true)}>{L("Criar conteúdo", "Create content")}</Button>}
          />
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((d) => (
              <button
                key={d.id}
                onClick={() => navigate({ to: "/content/$contentId", params: { contentId: d.id } })}
                className="glass min-w-0 rounded-2xl p-5 text-left"
              >
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{L("Rascunho", "Draft")}</p>
                <h2 className="mt-2 truncate text-lg font-semibold">{d.title}</h2>
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                  {d.body || L("Rascunho vazio", "Empty draft")}
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  {d.updatedAt ? `${L("Editado", "Edited")} ${new Date(d.updatedAt).toLocaleString(resolvedLocale)}` : L("Rascunho", "Draft")} ·
                  {L("Continuar", "Continue")} →
                </p>
              </button>
            ))}
          </div>
        )}
        <CreateDialog
          open={open}
          close={() => setOpen(false)}
          created={async (id) => {
            await client.invalidateQueries({ queryKey: contentKey });
            setOpen(false);
            navigate({ to: "/content/$contentId", params: { contentId: id } });
          }}
        />
      </WorkspaceShell>
    </PageShell>
  );
}
function CreateDialog({
  open,
  close,
  created,
}: {
  open: boolean;
  close: () => void;
  created: (id: string) => void;
}) {
  const { resolvedLocale } = useLanguage();
  const L = (pt: string, en: string) => (resolvedLocale === "pt-BR" ? pt : en);
  const formatLabel = (value: string) =>
    ({
      "Social Post": L("Post social", "Social Post"),
      Email: L("E-mail", "Email"),
      Article: L("Artigo", "Article"),
      Script: L("Roteiro", "Script"),
      "Ad Copy": L("Texto de anúncio", "Ad Copy"),
      Description: L("Descrição", "Description"),
    })[value] ?? value;
  const [format, setFormat] = useState(formats[0]);
  const [topic, setTopic] = useState("");
  const [objective, setObjective] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [context, setContext] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const create = useMutation({
    mutationFn: () =>
      ContentService.createDraft({
        title: topic.trim(),
        body: [
          `${L("Formato", "Format")}: ${formatLabel(format)}`,
          objective && `${L("Objetivo", "Objective")}: ${objective}`,
          audience && `${L("Público", "Audience")}: ${audience}`,
          tone && `${L("Tom", "Tone")}: ${tone}`,
          context && `${L("Contexto", "Context")}: ${context}`,
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    onSuccess: (d) => created(d.id),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {L("Criar conteúdo", "Create content")} · {step === 1 ? L("Ideia", "Idea") : step === 2 ? L("Contexto", "Context") : L("Rascunho", "Draft")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <span className={step >= 1 ? "font-semibold text-foreground" : "text-muted-foreground"}>
              {L("IDEIA", "IDEA")}
            </span>
            <span className={step >= 2 ? "font-semibold text-foreground" : "text-muted-foreground"}>
              {L("CONTEXTO", "CONTEXT")}
            </span>
            <span className={step >= 3 ? "font-semibold text-foreground" : "text-muted-foreground"}>
              {L("RASCUNHO", "DRAFT")}
            </span>
          </div>
          {step === 1 && (
            <>
              <Field label={L("Tipo de conteúdo", "Content type")}>
                <select
                  className="h-11 w-full rounded-md border bg-background px-3"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  {formats.map((f) => (
                    <option key={f}>{formatLabel(f)}</option>
                  ))}
                </select>
              </Field>
              <Field label={L("Tema", "Topic")}>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
              </Field>
            </>
          )}
          {step === 2 && (
            <>
              <Field label={L("Objetivo", "Objective")}>
                <Input value={objective} onChange={(e) => setObjective(e.target.value)} />
              </Field>
              <Field label={L("Público", "Audience")}>
                <Input value={audience} onChange={(e) => setAudience(e.target.value)} />
              </Field>
              <Field label={L("Tom", "Tone")}>
                <Input value={tone} onChange={(e) => setTone(e.target.value)} />
              </Field>
              <Field label={L("Contexto adicional", "Additional context")}>
                <Textarea value={context} onChange={(e) => setContext(e.target.value)} />
              </Field>
            </>
          )}
          {step === 3 && (
            <div className="rounded-xl border p-4">
              <p className="text-xs uppercase text-muted-foreground">{L("Pronto para rascunhar", "Ready to draft")}</p>
              <h3 className="mt-2 font-semibold">{topic}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatLabel(format)} {L("para", "for")} {audience || L("seu público", "your audience")} · {tone || L("tom natural", "natural tone")}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {L("Este briefing vira conteúdo inicial editável; nenhum campo extra de schema é criado.", "This brief becomes initial editable content; no extra schema fields are created.")}
              </p>
            </div>
          )}
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((step - 1) as 1 | 2)}>
                {L("Voltar", "Back")}
              </Button>
            )}
            <Button
              className="flex-1"
              disabled={!topic.trim() || create.isPending}
              onClick={() => (step < 3 ? setStep((step + 1) as 2 | 3) : create.mutate())}
            >
              {create.isPending ? L("Criando…", "Creating…") : step < 3 ? L("Continuar", "Continue") : L("Criar rascunho", "Create draft")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1">{label}</Label>
      {children}
    </div>
  );
}
