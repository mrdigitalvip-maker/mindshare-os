import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { RouteState } from "@/components/parity-state";
import { Input } from "@/components/ui/input";
import { listPacks, parityKeys } from "@/services/parity-service";
export const Route = createFileRoute("/_shell/packs")({ component: Packs });
function Packs() {
  const q = useQuery({ queryKey: parityKeys.packs, queryFn: listPacks }),
    [category, setCategory] = useState("");
  const shown = q.data?.filter((p) => !category || p.category === category);
  return (
    <PageShell>
      <PageHeader
        title="Journey Packs"
        description="Blueprints oficiais que criam Jornadas canônicas em todos os clientes."
      />
      <label htmlFor="pack-category" className="sr-only">
        Filtrar categoria
      </label>
      <Input
        id="pack-category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Filtrar por categoria"
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
            <article key={p.id} className="min-w-0 rounded-xl border p-5">
              <p className="text-xs uppercase text-muted-foreground">
                {p.category} · {p.duration_days} dias
              </p>
              <h2 className="mt-2 text-lg font-semibold">{p.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{p.short_description}</p>
              <Link
                className="mt-4 inline-block underline"
                to="/packs/$slug"
                params={{ slug: p.slug }}
              >
                Ver Pack
              </Link>
            </article>
          ))}
        </div>
      </RouteState>
    </PageShell>
  );
}
