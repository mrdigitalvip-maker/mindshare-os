import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { RouteState } from "@/components/parity-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPacks, parityKeys } from "@/services/parity-service";
import { WorkspaceShell } from "@/components/workspace-ui";
import { useLanguage } from "@/providers/language-provider";

export const Route = createFileRoute("/_shell/packs")({ component: Packs });

function Packs() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname !== "/packs" && pathname !== "/packs/" ? <Outlet /> : <PacksIndex />;
}

function PacksIndex() {
  const { resolvedLocale } = useLanguage();
  const L = (pt: string, en: string) => (resolvedLocale === "pt-BR" ? pt : en);
  const navigate = useNavigate();
  const q = useQuery({ queryKey: parityKeys.packs, queryFn: listPacks });
  const [category, setCategory] = useState("");
  const shown = q.data?.filter((p) => !category || p.category === category);

  return (
    <PageShell>
      <PageHeader
        title={L("Packs de Jornadas", "Journey Packs")}
        description={L("Blueprints oficiais que criam Jornadas canônicas em todos os clientes.", "Official blueprints that create canonical Journeys across all clients.")}
      />
      <WorkspaceShell>
        <label htmlFor="pack-category" className="sr-only">
          {L("Filtrar categoria", "Filter category")}
        </label>
        <Input
          id="pack-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder={L("Filtrar por categoria", "Filter by category")}
          className="mb-5 max-w-sm"
        />
        <RouteState
          loading={q.isLoading}
          error={q.isError}
          empty={!shown?.length}
          onRetry={() => void q.refetch()}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown?.map((p) => (
              <article key={p.id} className="v2-surface min-w-0 rounded-2xl p-5">
                <p className="text-xs uppercase text-muted-foreground">
                  {p.category} · {p.duration_days} {L("dias", "days")}
                </p>
                <h2 className="mt-2 text-lg font-semibold">{p.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{p.short_description}</p>
                <Button
                  type="button"
                  variant="link"
                  className="mt-3 h-auto min-h-11 px-0"
                  onClick={() => void navigate({ to: "/packs/$slug", params: { slug: p.slug } })}
                >
                  {L("Ver Pack", "View Pack")}
                </Button>
              </article>
            ))}
          </div>
        </RouteState>
      </WorkspaceShell>
    </PageShell>
  );
}
