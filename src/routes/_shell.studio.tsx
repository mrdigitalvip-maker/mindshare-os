import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BrainCircuit,
  Flame,
  Languages,
  PenTool,
  RefreshCw,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StudioService, type StudioCategory } from "@/services/studio-service";

export const Route = createFileRoute("/_shell/studio")({
  head: () => ({ meta: [{ title: "Studio — NEXORA" }] }),
  component: Studio,
});

const PATHS = [
  {
    category: "language" as const,
    to: "/studio/languages" as const,
    icon: Languages,
    title: "Language Lab",
    kicker: "Practice & fluency",
    text: "A focused path through vocabulary, writing, grammar and conversation.",
  },
  {
    category: "academy" as const,
    to: "/studio/ai-academy" as const,
    icon: BrainCircuit,
    title: "AI Academy",
    kicker: "Systems & capability",
    text: "Build practical AI judgment through modular, responsible learning.",
  },
  {
    category: "creator" as const,
    to: "/studio/creator-growth" as const,
    icon: PenTool,
    title: "Creator Growth",
    kicker: "Craft & momentum",
    text: "Turn sustainable creative practice into a repeatable publishing rhythm.",
  },
];

function Studio() {
  const query = useQuery({
    queryKey: ["studio", "overview"],
    queryFn: () => StudioService.overview(),
    retry: 2,
  });
  if (query.isPending)
    return (
      <PageShell>
        <div
          className="studio-shell mt-2 min-h-[70dvh] animate-pulse rounded-[2rem] motion-reduce:animate-none"
          aria-live="polite"
        >
          <span className="sr-only">Loading Studio</span>
        </div>
      </PageShell>
    );
  if (query.isError)
    return (
      <PageShell>
        <div
          className="studio-shell mt-2 grid min-h-[55dvh] place-items-center rounded-[2rem] p-6 text-center"
          role="alert"
        >
          <div>
            <Sparkles className="mx-auto h-8 w-8 text-cyan-300" />
            <h1 className="mt-4 text-2xl font-semibold">Studio is temporarily unavailable.</h1>
            <p className="mt-2 text-sm text-white/60">
              Your learning progress is safe. Try loading it again.
            </p>
            <Button className="mt-5" variant="outline" onClick={() => query.refetch()}>
              <RefreshCw />
              Try again
            </Button>
          </div>
        </div>
      </PageShell>
    );
  const data = query.data;
  const completeIds = new Set(
    data.progress
      .filter((p: { status: string }) => p.status === "completed")
      .map((p: { lesson_id: string }) => p.lesson_id),
  );
  const completed = completeIds.size;
  const total = data.lessons.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const today = data.goals[0];
  const activeEnrollment = data.enrollments[0];
  const activeTrack = data.tracks.find((track) => track.id === activeEnrollment?.track_id);
  const nextLesson = data.lessons.find(
    (lesson) => lesson.track_id === activeTrack?.id && !completeIds.has(lesson.id),
  );
  const activePath = PATHS.find((path) => path.category === activeTrack?.category) ?? PATHS[0];
  return (
    <PageShell>
      <div className="studio-shell mt-2 overflow-hidden rounded-[2rem] border border-white/10 p-4 sm:p-7 lg:p-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="studio-mark">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.3em] text-cyan-200/70">
                NEXORA learning system
              </p>
              <h1 className="text-xl font-semibold tracking-tight">
                Studio <span className="font-normal text-white/40">/ 2.0</span>
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Metric icon={Flame} value={`${data.streak?.current_streak ?? 0}`} label="day streak" />
            <Metric icon={Zap} value={`${data.streak?.total_xp ?? 0}`} label="XP" />
          </div>
        </header>
        <section className="studio-hero mt-7 grid gap-7 rounded-[1.75rem] border border-white/10 p-5 sm:p-8 lg:grid-cols-[1.4fr_.8fr] lg:p-10">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[.24em] text-cyan-200">
              {activeTrack ? "Your active trajectory" : "Your next trajectory"}
            </p>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-[-.04em] sm:text-5xl">
              {activeTrack?.title ?? "Build momentum, one useful lesson at a time."}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/60">
              {nextLesson
                ? `Next: ${nextLesson.title} · ${nextLesson.estimated_minutes} minutes`
                : activeTrack
                  ? "This track is complete. Choose your next learning path."
                  : "Select a path and Studio will preserve your goals, progress and achievements."}
            </p>
            <Link to={activePath.to}>
              <Button className="mt-7 min-h-12 rounded-full bg-cyan-200 px-6 text-slate-950 hover:bg-cyan-100">
                {activeTrack ? "Continue learning" : "Choose a path"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center">
            <div
              className="studio-progress-ring"
              style={{ "--studio-progress": `${progress * 3.6}deg` } as React.CSSProperties}
              role="progressbar"
              aria-label="Overall Studio progress"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div>
                <strong>{progress}%</strong>
                <span>
                  {completed} of {total}
                  <br />
                  lessons
                </span>
              </div>
            </div>
          </div>
        </section>
        <section
          className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Studio progress summary"
        >
          <Stat
            icon={Flame}
            label="Current streak"
            value={`${data.streak?.current_streak ?? 0} days`}
            detail={`Best: ${data.streak?.longest_streak ?? 0} days`}
          />
          <Stat
            icon={Trophy}
            label="Achievements"
            value={String(data.achievements.length)}
            detail="Persisted milestones"
          />
          <Stat
            icon={Zap}
            label="Total XP"
            value={String(data.streak?.total_xp ?? 0)}
            detail="From completed work"
          />
          <Stat
            icon={Sparkles}
            label="Daily goal"
            value={`${today?.completed_minutes ?? 0}/${today?.target_minutes ?? 15} min`}
            detail={today?.completed ? "Goal complete" : "Keep your rhythm"}
          />
        </section>
        <section className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="studio-kicker">Learning environments</p>
                <h2 className="mt-1 text-2xl font-semibold">Choose your mode</h2>
              </div>
              <span className="hidden text-xs text-white/40 sm:block">
                Progress stays connected
              </span>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {PATHS.map((path) => {
                const pathLessons = data.lessons.filter(
                  (l) => data.tracks.find((t) => t.id === l.track_id)?.category === path.category,
                );
                const pathDone = pathLessons.filter((l) => completeIds.has(l.id)).length;
                return (
                  <Path
                    key={path.category}
                    {...path}
                    complete={pathDone}
                    total={pathLessons.length}
                  />
                );
              })}
            </div>
          </div>
          <Weekly goals={data.goals} />
        </section>
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="studio-kicker">Recommended next action</p>
              <h2 className="mt-1 text-lg font-semibold">
                {nextLesson?.title ?? "Open a learning environment"}
              </h2>
              <p className="mt-1 text-sm text-white/50">
                {nextLesson?.description ??
                  "Enroll in a track to begin collecting real progress data."}
              </p>
            </div>
            <Link to={activePath.to}>
              <Button
                variant="outline"
                className="min-h-11 rounded-full border-white/15 bg-white/5"
              >
                Open {activePath.title}
                <ArrowRight />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
function Metric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Flame;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
      <Icon className="h-4 w-4 text-cyan-200" />
      <span className="text-sm font-semibold">{value}</span>
      <span className="hidden text-xs text-white/45 sm:inline">{label}</span>
    </div>
  );
}
function Stat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="studio-panel rounded-2xl p-4">
      <div className="flex items-center gap-2 text-white/50">
        <Icon className="h-4 w-4 text-cyan-200" />
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-white/40">{detail}</p>
    </article>
  );
}
function Path({
  to,
  icon: Icon,
  title,
  kicker,
  text,
  category,
  complete,
  total,
}: {
  to: "/studio/languages" | "/studio/ai-academy" | "/studio/creator-growth";
  icon: typeof Languages;
  title: string;
  kicker: string;
  text: string;
  category: StudioCategory;
  complete: number;
  total: number;
}) {
  const pct = total ? Math.round((complete / total) * 100) : 0;
  return (
    <Link to={to} className={`studio-path studio-path-${category} group rounded-2xl border p-5`}>
      <div className="flex items-center justify-between">
        <span className="studio-path-icon">
          <Icon />
        </span>
        <ArrowRight className="h-4 w-4 text-white/35 transition group-hover:translate-x-1 group-hover:text-white motion-reduce:transform-none" />
      </div>
      <p className="mt-6 text-[10px] uppercase tracking-[.2em] text-white/45">{kicker}</p>
      <h3 className="mt-1 text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/55">{text}</p>
      <div className="mt-5 flex items-center gap-3">
        <Progress value={pct} className="h-1.5" aria-label={`${title}: ${pct}% complete`} />
        <span className="text-xs text-white/45">{pct}%</span>
      </div>
    </Link>
  );
}
function Weekly({
  goals,
}: {
  goals: Array<{ goal_date: string; completed_minutes: number; target_minutes: number }>;
}) {
  const chronological = [...goals].reverse();
  return (
    <aside className="studio-panel rounded-2xl p-5">
      <p className="studio-kicker">Real activity</p>
      <h2 className="mt-1 text-xl font-semibold">Last 7 days</h2>
      {chronological.length ? (
        <div
          className="mt-6 flex h-36 items-end justify-between gap-2"
          role="img"
          aria-label="Minutes studied per day"
        >
          {chronological.map((g) => {
            const pct = Math.min(
              100,
              g.target_minutes ? (g.completed_minutes / g.target_minutes) * 100 : 0,
            );
            return (
              <div
                key={g.goal_date}
                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="text-[10px] text-white/45">{g.completed_minutes}</span>
                <div className="relative h-24 w-full max-w-8 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-full bg-gradient-to-t from-violet-500 to-cyan-300"
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="text-[9px] uppercase text-white/35">
                  {new Date(`${g.goal_date}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: "narrow",
                  })}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm leading-6 text-white/50">
          Your weekly chart appears after the first recorded learning activity. No sample data is
          shown.
        </p>
      )}
    </aside>
  );
}
