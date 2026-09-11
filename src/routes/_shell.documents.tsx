import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader, EmptyState } from "@/components/page-shell";
import { useLanguage } from "@/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentService, workspaceQueryKeys } from "@/services";

export const Route = createFileRoute("/_shell/documents")({
  head: () => ({ meta: [{ title: "Documents — KIVRYN" }] }),
  component: Documents,
});
type Document = Awaited<ReturnType<typeof DocumentService.list>>[number];
function Documents() {
  const { t, resolvedLocale } = useLanguage();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Document | null>();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("updated");
  const query = useQuery({ queryKey: workspaceQueryKeys.documents, queryFn: DocumentService.list });
  const refresh = () => client.invalidateQueries({ queryKey: workspaceQueryKeys.documents });
  const remove = useMutation({
    mutationFn: DocumentService.remove,
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const duplicate = useMutation({
    mutationFn: (document: Document) =>
      DocumentService.createUploadRecord(
        `${document.title} ${t("documents.copySuffix")}`,
        document.type,
        document.summary,
      ),
    onSuccess: () => void refresh(),
    onError: (e: Error) => toast.error(e.message),
  });
  const visible = useMemo(
    () =>
      (query.data ?? [])
        .filter((d) => `${d.title} ${d.summary}`.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) =>
          sort === "name" ? a.title.localeCompare(b.title) : b.updatedAt.localeCompare(a.updatedAt),
        ),
    [query.data, search, sort],
  );
  return (
    <PageShell>
      <PageHeader
        eyebrow={t("documents.eyebrow")}
        title={t("page.documents.title")}
        description={t("page.documents.description")}
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus /> {t("documents.new")}
          </Button>
        }
      />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("documents.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-11 rounded-md border border-input bg-background px-3"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="updated">{t("documents.recentlyUpdated")}</option>
          <option value="name">{t("documents.name")}</option>
        </select>
      </div>
      {query.isLoading ? (
        <p className="mt-10 text-center text-muted-foreground">{t("documents.loading")}</p>
      ) : query.isError ? (
        <div role="alert" className="mt-6 rounded-2xl border border-destructive/30 p-6">
          <h2 className="font-semibold">{t("documents.loadError")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("documents.loadErrorHelp")}</p>
          <Button className="mt-4" variant="outline" onClick={() => query.refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : !visible.length ? (
        <EmptyState
          icon={FileText}
          title={t("documents.empty")}
          description={t("documents.emptyHelp")}
          action={<Button onClick={() => setEditing(null)}>{t("documents.new")}</Button>}
        />
      ) : (
        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("documents.recent")}
              </p>
              <h2 className="text-xl font-semibold">{t("documents.all")}</h2>
            </div>
            <span className="text-sm text-muted-foreground">
              {t("documents.count", { count: visible.length })}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((document) => (
              <article key={document.id} className="v2-surface rounded-2xl p-5">
                <FileText className="h-5 w-5 text-intelligence" />
                <h2 className="mt-3 truncate text-lg font-medium">{document.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {document.type} ·{" "}
                  {t("documents.updated", {
                    date: new Date(document.updatedAt).toLocaleDateString(resolvedLocale),
                  })}
                </p>
                <p className="mt-3 line-clamp-3 min-h-12 text-sm text-muted-foreground">
                  {document.summary || t("documents.noSummary")}
                </p>
                <div className="mt-4 flex justify-end">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t("documents.open", { title: document.title })}
                    onClick={() =>
                      navigate({
                        to: "/documents/$documentId",
                        params: { documentId: document.id },
                      })
                    }
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t("documents.duplicate", { title: document.title })}
                    disabled={duplicate.isPending}
                    onClick={() => duplicate.mutate(document)}
                  >
                    <Copy />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t("documents.delete", { title: document.title })}
                    disabled={remove.isPending}
                    onClick={() =>
                      confirm(t("documents.deleteConfirm", { title: document.title })) &&
                      remove.mutate(document.id)
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <DocumentDialog
        key={editing === undefined ? "closed" : (editing?.id ?? "new")}
        value={editing}
        close={() => setEditing(undefined)}
        saved={async (id) => {
          await refresh();
          setEditing(undefined);
          navigate({ to: "/documents/$documentId", params: { documentId: id } });
        }}
      />
    </PageShell>
  );
}
function DocumentDialog({
  value,
  close,
  saved,
}: {
  value: Document | null | undefined;
  close: () => void;
  saved: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [title, setTitle] = useState(value?.title ?? "");
  const [type, setType] = useState(value?.type ?? "text");
  const [content, setContent] = useState(value?.summary ?? "");
  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error(t("documents.titleRequired"));
      if (value) {
        await DocumentService.update(value.id, { title: title.trim(), file_type: type, content });
        return value;
      } else {
        return DocumentService.createUploadRecord(title.trim(), type, content);
      }
    },
    onSuccess: (document) => {
      toast.success(value ? t("documents.updatedSuccess") : t("documents.created"));
      saved(document.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={value !== undefined} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{value ? t("documents.edit") : t("documents.new")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="document-title">{t("documents.title")}</Label>
            <Input
              id="document-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="document-content">{t("documents.initialContent")}</Label>
            <textarea
              id="document-content"
              className="mt-1 min-h-32 w-full rounded-md border bg-background p-3"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="document-type">{t("documents.type")}</Label>
            <Input id="document-type" value={type} onChange={(e) => setType(e.target.value)} />
          </div>
          <p className="text-sm text-muted-foreground">{t("documents.databaseHelp")}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close}>
              {t("common.cancel")}
            </Button>
            <Button disabled={save.isPending || !title.trim()} onClick={() => save.mutate()}>
              {save.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
