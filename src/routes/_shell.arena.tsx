import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { RouteState } from "@/components/parity-state";
import { Button } from "@/components/ui/button";
import { joinArena, listArena, parityKeys, safeBackendError } from "@/services/parity-service";
export const Route = createFileRoute("/_shell/arena")({ component: Arena });
function Arena() {
  const qc = useQueryClient(),
    q = useQuery({ queryKey: parityKeys.arena, queryFn: listArena });
  const join = useMutation({
    mutationFn: joinArena,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: parityKeys.arena });
      toast.success("Challenge joined.");
    },
    onError: (e) => toast.error(safeBackendError(e)),
  });
  return (
    <PageShell>
      <PageHeader
        title="Arena"
        description="Verified challenges. No rankings or participant counts are fabricated."
      />
      <RouteState
        loading={q.isLoading}
        error={q.isError}
        empty={!q.data?.length}
        onRetry={() => void q.refetch()}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {q.data?.map((c) => {
            const expired = Date.now() >= new Date(c.ends_at).getTime();
            return (
              <article key={c.id} className="rounded-xl border p-5">
                <h2 className="text-lg font-semibold">{c.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                <p className="mt-4 text-sm">
                  Verified progress: {Math.min(c.progress, c.target_value)} / {c.target_value}
                </p>
                <p className="text-sm">Reward: {c.reward_points} Momentum</p>
                {!c.joined_at && !expired && (
                  <Button
                    className="mt-4"
                    disabled={join.isPending}
                    onClick={() => join.mutate(c.id)}
                  >
                    Join challenge
                  </Button>
                )}
                {expired && <p className="mt-4 text-sm text-muted-foreground">Challenge ended.</p>}
              </article>
            );
          })}
        </div>
      </RouteState>
    </PageShell>
  );
}
