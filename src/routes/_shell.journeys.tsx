import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { useLanguage } from "@/providers/language-provider";
import { RouteState } from "@/components/parity-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetricCard, WorkspaceShell } from "@/components/workspace-ui";
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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname !== "/journeys" && pathname !== "/journeys/" ? <Outlet /> : <JourneysIndex />;
}

function JourneysIndex() {
  const { t, resolvedLocale } = useLanguage();
  const L = (pt: string, en: string) => (resolvedLocale === "pt-BR" ? pt : en);
  const qc = useQueryClient();
  const nav = useNavigate();
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
      toast.success(L("Jornada criada.", "Journey created."));
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
      toast.success(L("Missão confirmada pelo servidor.", "Mission confirmed by the server."));
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
      <WorkspaceShell>
        <PageHeader
          eyebrow={L("Espaço de execução", "Execution workspace")}
          title={t("page.journeys.title")}
          description={t("page.journeys.description")}
        />
        <div className="mb-6 flex flex-wrap gap-2">
          <Button onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {L("Nova Jornada", "New Journey")}
          </Button>
          <Link to="/packs">
            <Button variant="outline">{L("Explorar Packs", "Explore Packs")}</Button>
          </Link>
        </div>
        {open && (
          <form
            onSubmit={submit}
            className="v2-surface mb-8 grid max-w-2xl gap-3 rounded-2xl p-5"
            aria-label={L("Criar Jornada", "Create Journey")}
          >
            <label htmlFor="journey-title">{L("Título", "Title")}</label>
            <Input id="journey-title" name="title" required minLength={1} maxLength={160} />
            <label htmlFor="journey-objective">{L("Objetivo", "Objective")}</label>
            <Input id="journey-objective" name="objective" required maxLength={1000} />
            <label htmlFor="journey-category">{L("Categoria", "Category")}</label>
            <select
              id="journey-category"
              name="category"
              className="h-10 rounded-md border bg-background px-3"
            >
              <option value="personal">{L("Pessoal", "Personal")}</option>
              <option value="study">{L("Estudos", "Study")}</option>
              <option value="fitness">{L("Fitness", "Fitness")}</option>
              <option value="business">{L("Negócios", "Business")}</option>
              <option value="creator">{L("Criador", "Creator")}</option>
              <option value="travel">{L("Viagem", "Travel")}</option>
              <option value="custom">{L("Outra", "Other")}</option>
            </select>
            <label htmlFor="journey-date">{L("Data-alvo (opcional)", "Target date (optional)")}</label>
            <Input
              id="journey-date"
              name="targetDate"
              type="date"
              min={new Date().toLocaleDateString("en-CA")}
            />
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? L("Criando…", "Creating…") : L("Criar Jornada", "Create Journey")}
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
          <section className="v2-surface rounded-2xl p-5" aria-labelledby="daily">
            <h2 id="daily" className="text-xl font-semibold">
              {L("Missão diária", "Daily mission")}
            </h2>
            {mission.data ? (
              <article className="mt-3 rounded-xl border border-intelligence/25 bg-intelligence/5 p-5">
                <p className="text-xs uppercase text-muted-foreground">
                  {mission.data.source_type.replace("_", " ")}
                </p>
                <h3 className="font-medium">{mission.data.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{mission.data.description}</p>
                {mission.data.status === "completed" ? (
                  <p className="mt-3 text-sm" role="status">
                    {L("Concluída e verificada", "Completed and verified")}
                  </p>
                ) : mission.data.source_type === "journey_action" ? (
                  <Button
                    className="mt-4"
                    disabled={complete.isPending}
                    onClick={() => complete.mutate(mission.data!.id)}
                  >
                    {L("Confirmar conclusão", "Confirm completion")}
                  </Button>
                ) : (
                  <p className="mt-3 text-sm">{L("Conclua no módulo de origem para verificação.", "Complete it in the source module for verification.")}</p>
                )}
              </article>
            ) : (
              <p className="mt-3 text-muted-foreground">{L("Nenhuma ação elegível hoje.", "No eligible action today.")}</p>
            )}
          </section>
          {momentum.data && (
            <section className="mt-8" aria-labelledby="momentum">
              <h2 id="momentum" className="text-xl font-semibold">
                Momentum
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [L("Total", "Total"), momentum.data.total],
                  [L("Semana local", "Local week"), momentum.data.week],
                  [L("Missões verificadas", "Verified missions"), momentum.data.verifiedCount],
                  [L("Sequência", "Streak"), `${momentum.data.streak} ${L("dias", "days")}`],
                ].map(([label, value]) => (
                  <MetricCard key={label} label={String(label)} value={value} />
                ))}
              </div>
              {momentum.data.events.length > 0 && (
                <ul className="mt-3 space-y-2" aria-label={L("Execuções verificadas recentes", "Recent verified executions")}>
                  {momentum.data.events.map((event) => (
                    <li key={event.id} className="rounded-lg border px-4 py-2 text-sm">
                      {event.event_type.replaceAll("_", " ")} · +{event.points} ·{" "}
                      {new Date(event.created_at).toLocaleDateString(resolvedLocale)}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          <section className="mt-8">
            <h2 className="text-xl font-semibold">{L("Todas as Jornadas", "All Journeys")}</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {journeys.data?.map((j) => (
                <article key={j.id} className="v2-surface min-w-0 rounded-2xl p-5">
                  <h3 className="font-medium">{j.title}</h3>
                  <p className="mt-1 break-words text-sm text-muted-foreground">{j.objective}</p>
                  <p className="mt-3 text-xs uppercase">{j.status}</p>
                  <Link
                    className="mt-4 inline-flex min-h-11 items-center font-medium text-intelligence underline underline-offset-4"
                    to="/journeys/$journeyId"
                    params={{ journeyId: j.id }}
                  >
                    {L("Abrir detalhes", "Open details")}
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </RouteState>
      </WorkspaceShell>
    </PageShell>
  );
}
