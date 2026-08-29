import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, PageShell } from "@/components/page-shell";
import { RouteState } from "@/components/parity-state";
import { communityHome, parityKeys } from "@/services/parity-service";
export const Route = createFileRoute("/_shell/community")({ component: Community });
function Community() {
  const q = useQuery({ queryKey: parityKeys.community, queryFn: communityHome });
  const data = q.data;
  const squads = Array.isArray(data?.squads) ? (data.squads as Array<Record<string, unknown>>) : [];
  const activity = Array.isArray(data?.activity)
    ? (data.activity as Array<Record<string, unknown>>)
    : [];
  return (
    <PageShell>
      <PageHeader
        title="Community"
        description="Private-by-default Squads and privacy-safe verified activity."
      />
      <RouteState
        loading={q.isLoading}
        error={q.isError}
        empty={!squads.length && !activity.length}
        onRetry={() => void q.refetch()}
      >
        <section>
          <h2 className="text-xl font-semibold">Your Squads</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {squads.map((s, i) => (
              <article key={String(s.id || i)} className="rounded-xl border p-5">
                <h3 className="font-medium">{String(s.name || "Squad")}</h3>
                <p className="text-sm text-muted-foreground">
                  {Number(s.member_count || 0)} members
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Verified activity</h2>
          <div className="mt-3 space-y-3">
            {activity.map((a, i) => (
              <article key={String(a.id || i)} className="rounded-xl border p-4">
                <p>{String(a.display_name || "Community member")}</p>
                <p className="text-sm text-muted-foreground">
                  {String(a.event_type || "Verified execution")}
                </p>
              </article>
            ))}
          </div>
        </section>
      </RouteState>
    </PageShell>
  );
}
