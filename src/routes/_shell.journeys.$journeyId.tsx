import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, PageShell } from "@/components/page-shell";
import { RouteState } from "@/components/parity-state";
import { dailyMission, journeyDetail, parityKeys } from "@/services/parity-service";
export const Route = createFileRoute("/_shell/journeys/$journeyId")({ component: JourneyDetail });
function JourneyDetail() {
  const { journeyId } = Route.useParams();
  const q = useQuery({
    queryKey: parityKeys.journey(journeyId),
    queryFn: () => journeyDetail(journeyId),
  });
  const mission = useQuery({ queryKey: parityKeys.mission, queryFn: dailyMission });
  return (
    <PageShell>
      <Link to="/journeys" className="text-sm underline">
        ← Jornadas
      </Link>
      <PageHeader
        title={q.data?.title || "Detalhes da Jornada"}
        description="Dados persistidos e execução canônica."
      />
      <RouteState
        loading={q.isLoading || mission.isLoading}
        error={q.isError || mission.isError}
        empty={!q.data}
        onRetry={() => {
          void q.refetch();
          void mission.refetch();
        }}
      >
        {q.data && (
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl border p-5">
              <h2 className="font-semibold">Objetivo</h2>
              <p className="mt-2 text-muted-foreground">{q.data.objective}</p>
              <dl className="mt-4 grid gap-2 text-sm">
                <div>
                  <dt className="font-medium">Status</dt>
                  <dd>{q.data.status}</dd>
                </div>
                {q.data.target_date && (
                  <div>
                    <dt className="font-medium">Data-alvo</dt>
                    <dd>{q.data.target_date}</dd>
                  </div>
                )}
                {q.data.source_pack_id && (
                  <div>
                    <dt className="font-medium">Origem</dt>
                    <dd>Journey Pack · versão {q.data.source_pack_version}</dd>
                  </div>
                )}
              </dl>
            </section>
            <section className="rounded-xl border p-5">
              <h2 className="font-semibold">Ação atual</h2>
              {mission.data?.journey_id === journeyId ? (
                <>
                  <h3 className="mt-3">{mission.data.title}</h3>
                  <p className="text-sm text-muted-foreground">{mission.data.description}</p>
                  <p className="mt-3 text-sm">
                    {mission.data.status === "completed"
                      ? "Concluída e verificada"
                      : "Disponível na Missão diária"}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-muted-foreground">
                  Nenhuma missão canônica desta Jornada está selecionada hoje.
                </p>
              )}
            </section>
          </div>
        )}
      </RouteState>
    </PageShell>
  );
}
