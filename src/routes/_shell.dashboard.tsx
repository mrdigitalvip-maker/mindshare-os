import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Circle,
  GraduationCap,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";
import { DailyMissionCard } from "@/components/daily-mission-card";
import { CommandSectionHeading, CommandState } from "@/components/dashboard/v2-command-ui";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { useLanguage } from "@/providers/language-provider";
import { listJourneys, parityKeys } from "@/services/parity-service";
import { getRequiredUserId } from "@/services/supabase-service";
import { ProductivityService, ProjectService, StudyService } from "@/services/workspace-services";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({ meta: [{ title: "Command Center — KIVRYN" }] }),
  component: Dashboard,
});

const dashboardRetry = {
  retry: 2,
  retryDelay: (attempt: number) => Math.min(500 * 2 ** attempt, 2_000),
};

function Dashboard() {
  const { t, resolvedLocale } = useLanguage();
  const profile = useProfile();
  const projects = useQuery({
    queryKey: ["workspace", "projects"],
    queryFn: ProjectService.list,
    ...dashboardRetry,
  });
  const tasks = useQuery({
    queryKey: ["workspace", "tasks", "open"],
    queryFn: () => ProductivityService.listTasks({ status: "open" }),
    ...dashboardRetry,
  });
  const studies = useQuery({
    queryKey: ["workspace", "studies"],
    queryFn: StudyService.listPlans,
    ...dashboardRetry,
  });
  const journeys = useQuery({
    queryKey: parityKeys.journeys,
    queryFn: async () => {
      await getRequiredUserId();
      return listJourneys();
    },
    ...dashboardRetry,
  });
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
  const activeWorkLoading = projects.isLoading || studies.isLoading || journeys.isLoading;
  const activeWorkUnavailable = projects.isError && studies.isError && journeys.isError;
  const discoveryReady =
    !projects.isLoading &&
    !tasks.isLoading &&
    !studies.isLoading &&
    !journeys.isLoading &&
    !projects.isError &&
    !tasks.isError &&
    !studies.isError &&
    !journeys.isError;
  const showDiscovery =
    discoveryReady &&
    (projects.data?.length ?? 0) === 0 &&
    (tasks.data?.length ?? 0) === 0 &&
    (studies.data?.length ?? 0) === 0 &&
    (journeys.data?.length ?? 0) === 0;
  const discovery =
    resolvedLocale === "pt-BR"
      ? {
          eyebrow: "COMECE POR AQUI",
          title: "A KIVRYN transforma intenção em progresso real.",
          body: "Seu espaço ainda está vazio. Em vez de deixar você diante de vários módulos sem direção, comece por uma destas quatro portas.",
          items: [
            {
              to: "/assistant" as const,
              title: "Pensar com a KIVRYN",
              copy: "Converse com a IA usando o contexto do seu próprio espaço de trabalho.",
              action: "Abrir Assistente",
              icon: Bot,
            },
            {
              to: "/projects" as const,
              title: "Transformar objetivo em execução",
              copy: "Organize projetos, próximas ações e tarefas que realmente movem o trabalho.",
              action: "Criar projeto",
              icon: BriefcaseBusiness,
            },
            {
              to: "/studies" as const,
              title: "Aprender com estrutura",
              copy: "Crie disciplinas, sessões de foco e use IA para aprofundar o que está estudando.",
              action: "Abrir Estudos",
              icon: GraduationCap,
            },
            {
              to: "/journeys" as const,
              title: "Construir momentum",
              copy: "Converta metas em jornadas, missões e progresso verificável ao longo do tempo.",
              action: "Explorar Jornadas",
              icon: RouteIcon,
            },
          ],
        }
      : {
          eyebrow: "START HERE",
          title: "KIVRYN turns intention into real progress.",
          body: "Your workspace is still empty. Instead of dropping you into a wall of modules, start through one of these four doors.",
          items: [
            {
              to: "/assistant" as const,
              title: "Think with KIVRYN",
              copy: "Talk with AI using the context of your own workspace.",
              action: "Open Assistant",
              icon: Bot,
            },
            {
              to: "/projects" as const,
              title: "Turn goals into execution",
              copy: "Organize projects, next actions and tasks that move the work forward.",
              action: "Create project",
              icon: BriefcaseBusiness,
            },
            {
              to: "/studies" as const,
              title: "Learn with structure",
              copy: "Create subjects, focus sessions and use AI to go deeper in what you study.",
              action: "Open Studies",
              icon: GraduationCap,
            },
            {
              to: "/journeys" as const,
              title: "Build momentum",
              copy: "Turn goals into journeys, missions and verifiable progress over time.",
              action: "Explore Journeys",
              icon: RouteIcon,
            },
          ],
        };

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

      {showDiscovery ? (
        <section
          aria-labelledby="kivryn-discovery-heading"
          className="rounded-[1.75rem] border border-[color:var(--intelligence)]/25 bg-[radial-gradient(110%_130%_at_0%_0%,color-mix(in_oklab,var(--intelligence)_16%,transparent),transparent_55%),var(--surface)] p-5 shadow-[var(--shadow-soft)] sm:p-7"
        >
          <div className="flex max-w-3xl items-start gap-3">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--intelligence)]/30 bg-[color:var(--intelligence)]/10">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">
                {discovery.eyebrow}
              </p>
              <h2 id="kivryn-discovery-heading" className="mt-2 font-display text-2xl sm:text-3xl">
                {discovery.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {discovery.body}
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {discovery.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group rounded-2xl border border-border bg-background/55 p-4 transition hover:-translate-y-0.5 hover:border-[color:var(--intelligence)]/35 hover:bg-background"
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <h3 className="mt-4 font-medium">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-5 text-muted-foreground">{item.copy}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium">
                    {item.action}
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

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
        {activeWorkLoading ? (
          <CommandState text={t("common.loading")} />
        ) : activeWorkUnavailable ? (
          <CommandState text={t("common.error")} error />
        ) : (
          <div className="command-home__work-list">
            <WorkLink
              to="/projects"
              icon={BriefcaseBusiness}
              label={t("nav.projects")}
              count={projects.data?.length ?? 0}
              detail={projects.data?.[0]?.title}
              empty={projects.isError ? t("common.error") : t("projects.empty")}
            />
            <WorkLink
              to="/studies"
              icon={GraduationCap}
              label={t("nav.studies")}
              count={studies.data?.length ?? 0}
              detail={studies.data?.[0]?.title}
              empty={studies.isError ? t("common.error") : t("studies.empty")}
            />
            <WorkLink
              to="/journeys"
              icon={RouteIcon}
              label={t("nav.journeys")}
              count={journeys.data?.length ?? 0}
              detail={journeys.data?.[0]?.title}
              empty={journeys.isError ? t("common.error") : t("home.noJourneys")}
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
