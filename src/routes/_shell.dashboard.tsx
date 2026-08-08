import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  FolderKanban,
  Languages,
  ListTodo,
  MessageSquare,
  NotebookPen,
  Sparkles,
  Wallet,
} from "lucide-react";
import { PageShell, EmptyState } from "@/components/page-shell";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/hooks/dashboard/use-dashboard-stats";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NEXORA" }] }),
  component: Dashboard,
});

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data, isLoading, isError, refetch } = useDashboardStats();
  const displayName = profile?.full_name ?? user?.name ?? "Friend";

  return (
    <PageShell>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 md:p-8"
      >
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-gold/10 blur-[120px]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h1 className="mt-4 font-display text-4xl md:text-5xl">
              {greeting()}, <span className="text-gold">{displayName}</span>
            </h1>
            <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
              Your live workspace overview, calculated from your projects, work, learning, finances
              and assistant activity.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/assistant" search={{ conversation: undefined }}>
                <Button className="rounded-full">
                  Open Assistant <Sparkles className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/projects">
                <Button variant="outline" className="rounded-full">
                  View Projects <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/studio">
                <Button variant="outline" className="rounded-full">
                  Continue Learning <BookOpen className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-[360px]">
            <Snapshot
              label="Projects"
              value={data?.projects.total}
              icon={<FolderKanban />}
              loading={isLoading}
            />
            <Snapshot
              label="Tasks done"
              value={data?.tasks.completed}
              icon={<CheckCircle2 />}
              loading={isLoading}
            />
            <Snapshot
              label="Subjects"
              value={data?.studies.subjects}
              icon={<BookOpen />}
              loading={isLoading}
            />
            <Snapshot
              label="AI messages"
              value={data?.ai.messages}
              icon={<MessageSquare />}
              loading={isLoading}
            />
          </div>
        </div>
      </motion.section>

      {isError ? (
        <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="font-medium">We could not load your dashboard.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your data was not replaced with sample values.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : null}
      <div
        className="mt-10 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]"
        aria-busy={isLoading}
        aria-live="polite"
      >
        <DashboardSection title="Today" subtitle="Due and overdue work from your real task list.">
          {isLoading ? (
            <DashboardListSkeleton />
          ) : data?.todayTasks.length ? (
            <div className="space-y-3">
              {data.todayTasks.map((task) => (
                <Link
                  key={task.id}
                  to="/productivity"
                  className="glass flex min-h-14 items-center gap-3 rounded-2xl p-4 transition hover:border-gold/30"
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${task.overdue ? "bg-destructive" : "bg-gold"}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{task.title}</span>
                  <span
                    className={
                      task.overdue ? "text-xs text-destructive" : "text-xs text-muted-foreground"
                    }
                  >
                    {task.overdue ? "Overdue" : "Today"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="Today is clear"
              description="Capture the next concrete action when you are ready. It will stay in your task system."
              action={
                <Link to="/productivity">
                  <Button>Add a task</Button>
                </Link>
              }
            />
          )}
        </DashboardSection>
        <DashboardSection title="Continue" subtitle="Return directly to your latest work.">
          {isLoading ? (
            <DashboardListSkeleton />
          ) : data?.continuations.length ? (
            <div className="space-y-3">
              {data.continuations.map((item) => (
                <a
                  key={item.id}
                  href={item.path}
                  className="glass flex min-h-14 items-center justify-between rounded-2xl p-4 transition hover:border-gold/30"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.detail} · {formatDate(item.occurredAt)}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gold" />
                </a>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="Start something worth continuing"
              description="A project, document or conversation will appear here after you work on it."
              action={
                <Link to="/assistant" search={{ conversation: undefined }}>
                  <Button>Start with NEXORA AI</Button>
                </Link>
              }
            />
          )}
        </DashboardSection>
      </div>

      <div className="mt-12 grid gap-6 xl:grid-cols-2">
        <DashboardSection title="Recent projects" subtitle="Continue where you left off.">
          {isLoading ? (
            <DashboardListSkeleton />
          ) : data?.recentProjects.length ? (
            <div className="space-y-3">
              {data.recentProjects.map((project) => (
                <Link
                  key={project.id}
                  to="/projects/$projectId"
                  params={{ projectId: project.id }}
                  className="glass flex items-center justify-between rounded-2xl p-5 transition hover:border-gold/30"
                >
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{project.title}</h3>
                    <p className="mt-1 text-xs capitalize text-muted-foreground">
                      {project.status} · {formatDate(project.updatedAt)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gold" />
                </Link>
              ))}
            </div>
          ) : (
            !isLoading && (
              <EmptyState
                icon={FolderKanban}
                title="Turn an objective into an executable plan"
                description="Create tasks, track real progress and keep the next action visible."
                action={
                  <Link to="/projects">
                    <Button>Create project</Button>
                  </Link>
                }
              />
            )
          )}
        </DashboardSection>
        <DashboardSection title="Recent activity" subtitle="Latest changes across your workspace.">
          {isLoading ? (
            <DashboardListSkeleton />
          ) : data?.recentActivity.length ? (
            <div className="space-y-3">
              {data.recentActivity.map((activity) => (
                <div key={activity.id} className="glass flex items-center gap-3 rounded-2xl p-4">
                  <NotebookPen className="h-4 w-4 shrink-0 text-gold" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.module} · {formatDate(activity.occurredAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !isLoading && (
              <EmptyState
                icon={Clock3}
                title="No activity yet"
                description="Your latest workspace changes will appear here."
              />
            )
          )}
        </DashboardSection>
      </div>

      <div className="mt-12">
        <DashboardQuickActions />
      </div>
      <div className="mt-12">
        <DashboardSection
          title="Financial activity"
          subtitle="Totals calculated from your accounts and transactions."
        >
          <div className="grid gap-4 sm:grid-cols-3" aria-busy={isLoading}>
            <Metric
              label="Income"
              value={formatMoney(data?.finance.income ?? 0)}
              icon={<CircleDollarSign />}
            />
            <Metric
              label="Expenses"
              value={formatMoney(data?.finance.expenses ?? 0)}
              icon={<CircleDollarSign />}
            />
            <Metric
              label="Balance"
              value={formatMoney(data?.finance.balance ?? 0)}
              icon={<Wallet />}
            />
          </div>
        </DashboardSection>
      </div>
    </PageShell>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
function formatDate(value: string) {
  return value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : "Unknown date";
}
function DashboardListSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading recent workspace activity">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="glass rounded-2xl p-5">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-3 h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
function Snapshot({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value?: number;
  icon: React.ReactElement;
  loading: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      {<span className="block h-5 w-5 text-gold">{icon}</span>}
      <p className="mt-4 text-xs text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-14" />
      ) : (
        <p className="font-display text-3xl">{value ?? 0}</p>
      )}
    </div>
  );
}
function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactElement;
}) {
  return (
    <div className="glass flex items-center justify-between rounded-2xl p-5">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl">{value}</p>
      </div>
      <span className="h-5 w-5 text-gold">{icon}</span>
    </div>
  );
}
