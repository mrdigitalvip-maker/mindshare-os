import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Circle,
  GraduationCap,
  Route as RouteIcon,
} from "lucide-react";
import { DailyMissionCard } from "@/components/daily-mission-card";
import { CommandSectionHeading, CommandState } from "@/components/dashboard/v2-command-ui";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { useLanguage } from "@/providers/language-provider";
import { listJourneys, parityKeys } from "@/services/parity-service";
import { ProductivityService, ProjectService, StudyService } from "@/services/workspace-services";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({ meta: [{ title: "Command Center — KIVRYN" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t, resolvedLocale } = useLanguage();
  const profile = useProfile();
  const projects = useQuery({ queryKey: ["workspace", "projects"], queryFn: ProjectService.list });
  const tasks = useQuery({
    queryKey: ["workspace", "tasks", "open"],
    queryFn: () => ProductivityService.listTasks({ status: "open" }),
  });
  const studies = useQuery({ queryKey: ["workspace", "studies"], queryFn: StudyService.listPlans });
  const journeys = useQuery({ queryKey: parityKeys.journeys, queryFn: listJourneys });
  const name = profile.data?.full_name?.trim().split(/\s+/)[0];
  const priorityTasks = [...(tasks.data ?? [])]
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 } as Record<string, number>;
      return (rank[a.priority ?? "medium"] ?? 1) - (rank[b.priority ?? "medium"] ?? 1);
    })
    .slice(0, 5);
  const date = new Intl.DateTimeFormat(resolvedLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const loading = tasks.isLoading || projects.isLoading || studies.isLoading || journeys.isLoading;
  const error = tasks.isError || projects.isError || studies.isError || journeys.isError;

  return (
    <main className="command-home">
      <header className="command-home__header">
        <div>
          <p className="command-home__eyebrow">{date}</p>
          <h1>{name ? t("home.greetingName", { name }) : t("home.greeting")}</h1>
          <p>{t("home.description")}</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/assistant" search={{ conversation: undefined }}>
            <Bot />
            {t("home.askNexora")}
          </Link>
        </Button>
      </header>

      <div className="command-home__primary">
        <section
          className="command-home__today"
          aria-labelledby="today-heading"
          aria-busy={tasks.isLoading}
        >
          <CommandSectionHeading
            eyebrow={t("workspace.today")}
            title={t("home.nextActions")}
            id="today-heading"
            action={
              <Button asChild size="sm" variant="ghost">
                <Link to="/productivity">
                  {t("home.viewAll")}
                  <ArrowRight />
                </Link>
              </Button>
            }
          />
          {tasks.isLoading ? (
            <CommandState text={t("common.loading")} />
          ) : tasks.isError ? (
            <CommandState text={t("tasks.error")} error />
          ) : priorityTasks.length ? (
            <ol className="command-home__task-list">
              {priorityTasks.map((task) => (
                <li key={task.id}>
                  <Circle aria-hidden="true" />
                  <div>
                    <strong>{task.title}</strong>
                    <span>
                      {task.dueDate
                        ? new Intl.DateTimeFormat(resolvedLocale, { dateStyle: "medium" }).format(
                            new Date(task.dueDate),
                          )
                        : t("home.noDueDate")}
                    </span>
                  </div>
                  <span className={`command-home__priority is-${task.priority ?? "medium"}`}>
                    {task.priority === "high"
                      ? t("home.priority.high")
                      : task.priority === "low"
                        ? t("home.priority.low")
                        : t("home.priority.medium")}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <CommandState text={t("home.noActions")} />
          )}
        </section>

        <aside className="command-home__nexora" aria-labelledby="nexora-heading">
          <div className="command-home__orb">
            <Bot aria-hidden="true" />
          </div>
          <span>KIVRYN</span>
          <h2 id="nexora-heading">{t("home.nexoraTitle")}</h2>
          <p>
            {priorityTasks.length
              ? t("home.nexoraTasks", { count: priorityTasks.length })
              : t("home.nexoraEmpty")}
          </p>
          <Button asChild>
            <Link to="/assistant" search={{ conversation: undefined }}>
              {t("home.openAssistant")}
              <ArrowRight />
            </Link>
          </Button>
        </aside>
      </div>

      <section className="command-home__active" aria-labelledby="active-heading">
        <CommandSectionHeading
          eyebrow={t("home.workspace")}
          title={t("workspace.activeWork")}
          id="active-heading"
        />
        {loading ? (
          <CommandState text={t("common.loading")} />
        ) : error ? (
          <CommandState text={t("common.error")} error />
        ) : (
          <div className="command-home__work-list">
            <WorkLink
              to="/projects"
              icon={BriefcaseBusiness}
              label={t("nav.projects")}
              count={projects.data?.length ?? 0}
              detail={projects.data?.[0]?.title}
              empty={t("projects.empty")}
            />
            <WorkLink
              to="/studies"
              icon={GraduationCap}
              label={t("nav.studies")}
              count={studies.data?.length ?? 0}
              detail={studies.data?.[0]?.title}
              empty={t("studies.empty")}
            />
            <WorkLink
              to="/journeys"
              icon={RouteIcon}
              label={t("nav.journeys")}
              count={journeys.data?.length ?? 0}
              detail={journeys.data?.[0]?.title}
              empty={t("home.noJourneys")}
            />
          </div>
        )}
      </section>

      <DailyMissionCard />
    </main>
  );
}

function WorkLink({
  to,
  icon: Icon,
  label,
  count,
  detail,
  empty,
}: {
  to: "/projects" | "/studies" | "/journeys";
  icon: typeof BriefcaseBusiness;
  label: string;
  count: number;
  detail?: string;
  empty: string;
}) {
  return (
    <Link to={to} className="command-home__work-item">
      <Icon aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{detail || empty}</strong>
      </div>
      <span className="command-home__count">{count}</span>
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}
