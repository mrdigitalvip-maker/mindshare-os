import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { dailyMission, parityKeys } from "@/services/parity-service";
import { useLanguage } from "@/providers/language-provider";
export function DailyMissionCard() {
  const { t } = useLanguage();
  const q = useQuery({ queryKey: parityKeys.mission, queryFn: dailyMission });
  return (
    <section
      className="command-home__mission"
      aria-labelledby="home-mission"
      aria-busy={q.isLoading}
    >
      <h2 id="home-mission" className="font-semibold">
        {t("workspace.dailyMission")}
      </h2>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">{t("home.missionLoading")}</p>
      ) : q.isError ? (
        <p className="text-sm text-destructive">
          {t("home.missionError")}{" "}
          <button className="underline" onClick={() => void q.refetch()}>
            {t("common.retry")}
          </button>
        </p>
      ) : q.data ? (
        <>
          <p className="mt-1 text-sm">{q.data.title}</p>
          <p className="text-xs text-muted-foreground">
            {q.data.status === "completed" ? t("home.missionCompleted") : t("home.missionActive")}
          </p>
          <Link to="/journeys" className="mt-2 inline-block text-sm underline">
            {t("home.openMission")}
          </Link>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t("home.missionEmpty")}</p>
      )}
    </section>
  );
}
