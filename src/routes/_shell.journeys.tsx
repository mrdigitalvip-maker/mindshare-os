import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { RouteState } from "@/components/parity-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  completeJourneyAction,
  createJourney,
  dailyMission,
  listJourneys,
  momentumSummary,
  parityKeys,
  safeBackendError,
} from "@/services/parity-service";
export const Route = createFileRoute("/_shell/journeys")({ component: Journeys });
function Journeys() {
  const qc = useQueryClient(),
    nav = useNavigate();
  const [open, setOpen] = useState(false);
  const mission = useQuery({ queryKey: parityKeys.mission, queryFn: dailyMission });
  const journeys = useQuery({ queryKey: parityKeys.journeys, queryFn: listJourneys });
  const momentum = useQuery({ queryKey: parityKeys.momentum, queryFn: momentumSummary });
  const create = useMutation({
    mutationFn: (input: {
      title: string;
      objective: string;
      category: string;
      targetDate?: string;
    }) => createJourney(input),
    onSuccess: async (id) => {
      await qc.invalidateQueries({ queryKey: parityKeys.journeys });
      toast.success("Jornada criada.");
      await nav({ to: "/journeys/$journeyId", params: { journeyId: id } });
    },
    onError: (e) => toast.error(safeBackendError(e)),
  });
  const complete = useMutation({
    mutationFn: completeJourneyAction,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: parityKeys.mission }),
        qc.invalidateQueries({ queryKey: parityKeys.journeys }),
        qc.invalidateQueries({ queryKey: parityKeys.momentum }),
        qc.invalidateQueries({ queryKey: parityKeys.arena }),
        qc.invalidateQueries({ queryKey: parityKeys.community }),
      ]);
      toast.success("Missão confirmada pelo servidor.");
    },
    onError: (e) => toast.error(safeBackendError(e)),
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    create.mutate({
      title: String(f.get("title")),
      objective: String(f.get("objective")),
      category: String(f.get("category")),
      targetDate: String(f.get("targetDate") || "") || undefined,
    });
  }
  return (
    <PageShell>
      <PageHeader
        title="Jornadas"
        description="Missões e Jornadas canônicas, compartilhadas com o Android."
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Button onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          Nova Jornada
        </Button>
        <Link to="/packs">
          <Button variant="outline">Explorar Packs</Button>
        </Link>
      </div>
      {open && (
        <form
          onSubmit={submit}
          className="mb-8 grid max-w-2xl gap-3 rounded-xl border p-4"
          aria-label="Criar Jornada"
        >
          <label htmlFor="journey-title">Título</label>
          <Input id="journey-title" name="title" required minLength={1} maxLength={160} />
          <label htmlFor="journey-objective">Objetivo</label>
          <Input id="journey-objective" name="objective" required maxLength={1000} />
          <label htmlFor="journey-category">Categoria</label>
          <select
            id="journey-category"
            name="category"
            className="h-10 rounded-md border bg-background px-3"
          >
            <option value="personal">Pessoal</option>
            <option value="study">Estudos</option>
            <option value="fitness">Fitness</option>
            <option value="business">Negócios</option>
            <option value="creator">Criador</option>
            <option value="travel">Viagem</option>
            <option value="custom">Outra</option>
          </select>
          <label htmlFor="journey-date">Data-alvo (opcional)</label>
          <Input
            id="journey-date"
            name="targetDate"
            type="date"
            min={new Date().toLocaleDateString("en-CA")}
          />
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Criando…" : "Criar Jornada"}
          </Button>
        </form>
      )}
      <RouteState
        loading={mission.isLoading || journeys.isLoading || momentum.isLoading}
        error={mission.isError || journeys.isError || momentum.isError}
        empty={!mission.data && !journeys.data?.length}
        onRetry={() => {
          void mission.refetch();
          void journeys.refetch();
          void momentum.refetch();
        }}
      >
        <section aria-labelledby="daily">
          <h2 id="daily" className="text-xl font-semibold">
            Missão diária
          </h2>
          {mission.data ? (
            <article className="mt-3 rounded-xl border p-5">
              <p className="text-xs uppercase text-muted-foreground">
                {mission.data.source_type.replace("_", " ")}
              </p>
              <h3 className="font-medium">{mission.data.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{mission.data.description}</p>
              {mission.data.status === "completed" ? (
                <p className="mt-3 text-sm" role="status">
                  Concluída e verificada
                </p>
              ) : mission.data.source_type === "journey_action" ? (
                <Button
                  className="mt-4"
                  disabled={complete.isPending}
                  onClick={() => complete.mutate(mission.data!.id)}
                >
                  Confirmar conclusão
                </Button>
              ) : (
                <p className="mt-3 text-sm">Conclua no módulo de origem para verificação.</p>
              )}
            </article>
          ) : (
            <p className="mt-3 text-muted-foreground">Nenhuma ação elegível hoje.</p>
          )}
        </section>
        {momentum.data && (
          <section className="mt-8" aria-labelledby="momentum">
            <h2 id="momentum" className="text-xl font-semibold">
              Momentum
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Total", momentum.data.total],
                ["Semana local", momentum.data.week],
                ["Missões verificadas", momentum.data.verifiedCount],
                ["Sequência", `${momentum.data.streak} dias`],
              ].map(([label, value]) => (
                <div className="rounded-xl border p-4" key={label}>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <strong className="text-2xl">{value}</strong>
                </div>
              ))}
            </div>
            {momentum.data.events.length > 0 && (
              <ul className="mt-3 space-y-2" aria-label="Execuções verificadas recentes">
                {momentum.data.events.map((event) => (
                  <li key={event.id} className="rounded-lg border px-4 py-2 text-sm">
                    {event.event_type.replaceAll("_", " ")} · +{event.points} ·{" "}
                    {new Date(event.created_at).toLocaleDateString("pt-BR")}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Todas as Jornadas</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {journeys.data?.map((j) => (
              <article key={j.id} className="min-w-0 rounded-xl border p-5">
                <h3 className="font-medium">{j.title}</h3>
                <p className="mt-1 break-words text-sm text-muted-foreground">{j.objective}</p>
                <p className="mt-3 text-xs uppercase">{j.status}</p>
                <Link
                  className="mt-4 inline-block underline"
                  to="/journeys/$journeyId"
                  params={{ journeyId: j.id }}
                >
                  Abrir detalhes
                </Link>
              </article>
            ))}
          </div>
        </section>
      </RouteState>
    </PageShell>
  );
}
