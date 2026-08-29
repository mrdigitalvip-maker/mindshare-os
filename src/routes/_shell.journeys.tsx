import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { RouteState } from "@/components/parity-state";
import { Button } from "@/components/ui/button";
import {
  completeJourneyAction,
  dailyMission,
  listJourneys,
  parityKeys,
  safeBackendError,
} from "@/services/parity-service";
export const Route = createFileRoute("/_shell/journeys")({ component: Journeys });
function Journeys() {
  const qc = useQueryClient();
  const mission = useQuery({ queryKey: parityKeys.mission, queryFn: dailyMission });
  const journeys = useQuery({ queryKey: parityKeys.journeys, queryFn: listJourneys });
  const complete = useMutation({
    mutationFn: completeJourneyAction,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: parityKeys.all });
      toast.success("Mission verified.");
    },
    onError: (e) => toast.error(safeBackendError(e)),
  });
  return (
    <PageShell>
      <PageHeader
        title="Journeys"
        description="Your canonical missions and journeys, shared with Android."
      />
      <RouteState
        loading={mission.isLoading || journeys.isLoading}
        error={mission.isError || journeys.isError}
        empty={!mission.data && !journeys.data?.length}
        onRetry={() => {
          void mission.refetch();
          void journeys.refetch();
        }}
      >
        <section aria-labelledby="daily">
          <h2 id="daily" className="text-xl font-semibold">
            Daily mission
          </h2>
          {mission.data ? (
            <div className="mt-3 rounded-xl border p-5">
              <h3 className="font-medium">{mission.data.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{mission.data.description}</p>
              {mission.data.source_type === "journey_action" &&
                mission.data.status !== "completed" && (
                  <Button
                    className="mt-4"
                    disabled={complete.isPending}
                    onClick={() => complete.mutate(mission.data!.id)}
                  >
                    Confirm completion
                  </Button>
                )}
            </div>
          ) : (
            <p className="mt-3 text-muted-foreground">No eligible action today.</p>
          )}
        </section>
        <section className="mt-8">
          <h2 className="text-xl font-semibold">All journeys</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {journeys.data?.map((j) => (
              <article key={j.id} className="rounded-xl border p-5">
                <h3 className="font-medium">{j.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {j.objective || "No objective provided"}
                </p>
                <p className="mt-3 text-xs uppercase tracking-wide">{j.status}</p>
              </article>
            ))}
          </div>
        </section>
      </RouteState>
    </PageShell>
  );
}
