import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { dailyMission, parityKeys } from "@/services/parity-service";
export function DailyMissionCard() {
  const q = useQuery({ queryKey: parityKeys.mission, queryFn: dailyMission });
  return (
    <section
      className="mx-auto mb-4 w-full max-w-3xl rounded-xl border bg-background/80 p-4"
      aria-labelledby="home-mission"
      aria-busy={q.isLoading}
    >
      <h2 id="home-mission" className="font-semibold">
        Missão diária
      </h2>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando missão…</p>
      ) : q.isError ? (
        <p className="text-sm text-destructive">
          Não foi possível carregar.{" "}
          <button className="underline" onClick={() => void q.refetch()}>
            Tentar novamente
          </button>
        </p>
      ) : q.data ? (
        <>
          <p className="mt-1 text-sm">{q.data.title}</p>
          <p className="text-xs text-muted-foreground">
            {q.data.source_type.replace("_", " ")} ·{" "}
            {q.data.status === "completed" ? "verificada" : "pendente"}
          </p>
          <Link to="/journeys" className="mt-2 inline-block text-sm underline">
            Abrir execução
          </Link>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma missão elegível hoje.</p>
      )}
    </section>
  );
}
