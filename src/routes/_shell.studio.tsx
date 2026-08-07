import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BrainCircuit, Flame, Languages, PenTool, Trophy } from "lucide-react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StudioService } from "@/services/studio-service";
export const Route = createFileRoute("/_shell/studio")({
  head: () => ({ meta: [{ title: "Studio — NEXORA" }] }),
  component: Studio,
});
function Studio() {
  const { data } = useQuery({
    queryKey: ["studio", "overview"],
    queryFn: () => StudioService.overview(),
  });
  const completed =
    data?.progress.filter((p: { status: string }) => p.status === "completed").length ?? 0;
  const total = data?.lessons.length ?? 0;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const today = data?.goals[0];
  return (
    <PageShell>
      <PageHeader
        eyebrow="NEXORA Studio"
        title="Learn something useful every day"
        description="Three practical paths, one calm daily rhythm, and progress that is yours."
      />
      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <Flame className="text-gold" />
            <p className="mt-3 text-2xl font-semibold">{data?.streak?.current_streak ?? 0} days</p>
            <p className="text-sm text-muted-foreground">Current streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Trophy className="text-gold" />
            <p className="mt-3 text-2xl font-semibold">{data?.streak?.total_xp ?? 0} XP</p>
            <p className="text-sm text-muted-foreground">Internal learning points</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="mt-2 text-2xl font-semibold">
              {today?.completed_minutes ?? 0} / {today?.target_minutes ?? 15} min
            </p>
            <Progress
              className="mt-3"
              value={
                today ? Math.min(100, (today.completed_minutes / today.target_minutes) * 100) : 0
              }
              aria-label="Daily Studio goal"
            />
          </CardContent>
        </Card>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Learning paths</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Path
            to="/studio/languages"
            icon={Languages}
            title="Language Lab"
            text="English, Spanish, Portuguese and French."
          />
          <Path
            to="/studio/ai-academy"
            icon={BrainCircuit}
            title="AI Academy"
            text="Responsible AI, prompting, research and automation."
          />
          <Path
            to="/studio/creator-growth"
            icon={PenTool}
            title="Creator Growth"
            text="Strategy, audience, writing and sustainable consistency."
          />
        </div>
      </section>
      <Card className="mt-8">
        <CardContent className="p-6">
          <div className="flex justify-between text-sm">
            <span>Overall Studio progress</span>
            <span>{progress}%</span>
          </div>
          <Progress className="mt-3" value={progress} aria-label={`${progress}% Studio progress`} />
          <p className="mt-4 text-sm text-muted-foreground">
            {completed} lessons completed · {data?.achievements.length ?? 0} achievements · longest
            streak {data?.streak?.longest_streak ?? 0} days
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
function Path({
  to,
  icon: Icon,
  title,
  text,
}: {
  to: "/studio/languages" | "/studio/ai-academy" | "/studio/creator-growth";
  icon: typeof Languages;
  title: string;
  text: string;
}) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col p-6">
        <Icon className="h-7 w-7 text-gold" />
        <h3 className="mt-4 text-xl font-semibold">{title}</h3>
        <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{text}</p>
        <Link to={to}>
          <Button className="mt-5 min-h-11 w-full">
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
