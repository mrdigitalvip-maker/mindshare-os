import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Flame,
  LockKeyhole,
  Sparkles,
  Target,
  Timer,
  WandSparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StudioService, type StudioCategory, type StudioLesson } from "@/services/studio-service";
import { useSubscription } from "@/hooks/use-subscription";

const COPY = {
  language: {
    title: "Language Lab",
    eyebrow: "Studio · Languages",
    description: "Build usable language skills through focused, practical lessons.",
  },
  academy: {
    title: "AI Academy",
    eyebrow: "Studio · Responsible AI",
    description: "Learn to use AI with judgment through explanation, exercise and practice.",
  },
  creator: {
    title: "Creator Growth",
    eyebrow: "Studio · Sustainable creation",
    description: "Develop a useful creative practice—without income or virality promises.",
  },
};

export function StudioWorkspace({ category }: { category: StudioCategory }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const subscription = useSubscription();
  const { data, isLoading, error } = useQuery({
    queryKey: ["studio", "overview"],
    queryFn: () => StudioService.overview(),
  });
  const tracks = useMemo(
    () => data?.tracks.filter((track) => track.category === category) ?? [],
    [data, category],
  );
  const enrollments =
    data?.enrollments.filter((item) => tracks.some((track) => track.id === item.track_id)) ?? [];
  const [trackId, setTrackId] = useState("");
  const [level, setLevel] = useState("beginner");
  const [target, setTarget] = useState(
    category === "language" ? "Hold everyday conversations" : "Build practical skills",
  );
  const [minutes, setMinutes] = useState("15");
  const [answer, setAnswer] = useState("");
  const [openLesson, setOpenLesson] = useState<StudioLesson | null>(null);
  const enroll = useMutation({
    mutationFn: () =>
      StudioService.enroll({
        trackId,
        level,
        target,
        dailyMinutes: Number(minutes),
        locale:
          category === "language" ? tracks.find((item) => item.id === trackId)?.slug : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["studio"] });
      toast.success("Your learning plan is ready");
    },
  });
  const complete = useMutation({
    mutationFn: (lessonId: string) => StudioService.completeLesson(lessonId),
    onSuccess: async (result) => {
      toast.success(`Completed · +${result.xp} XP · ${result.streak} day streak`);
      setOpenLesson(null);
      setAnswer("");
      await queryClient.invalidateQueries({ queryKey: ["studio"] });
    },
  });

  if (isLoading)
    return (
      <PageShell>
        <p className="py-20 text-center text-muted-foreground" aria-live="polite">
          Loading Studio…
        </p>
      </PageShell>
    );
  if (error)
    return (
      <PageShell>
        <p className="py-20 text-center text-destructive">
          Studio could not load. Apply the Phase 3 migration and try again.
        </p>
      </PageShell>
    );
  const completed = new Set(
    (data?.progress ?? [])
      .filter((item: { status: string }) => item.status === "completed")
      .map((item: { lesson_id: string }) => item.lesson_id),
  );
  const lessons =
    data?.lessons.filter((lesson) => tracks.some((track) => track.id === lesson.track_id)) ?? [];
  const percent = lessons.length
    ? Math.round(
        (lessons.filter((lesson) => completed.has(lesson.id)).length / lessons.length) * 100,
      )
    : 0;
  const today = data?.goals[0];

  return (
    <PageShell>
      <PageHeader
        eyebrow={COPY[category].eyebrow}
        title={COPY[category].title}
        description={COPY[category].description}
      />
      {!enrollments.length ? (
        <Card className="mt-8 max-w-3xl">
          <CardHeader>
            <CardTitle>Set your daily path</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field
              label={
                category === "language" ? "What language do you want to learn?" : "Choose a track"
              }
            >
              <Select value={trackId} onValueChange={setTrackId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose one" />
                </SelectTrigger>
                <SelectContent>
                  {tracks.map((track) => (
                    <SelectItem key={track.id} value={track.id}>
                      {track.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="What is your current level?">
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["beginner", "elementary", "intermediate", "advanced"].map((item) => (
                    <SelectItem key={item} value={item} className="capitalize">
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="What is your goal?">
              <Input
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                maxLength={160}
              />
            </Field>
            <Field label="How many minutes per day?">
              <Input
                type="number"
                min={5}
                max={180}
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
              />
            </Field>
            <Button
              className="sm:col-span-2 min-h-11"
              disabled={!trackId || !target.trim() || enroll.isPending}
              onClick={() => enroll.mutate()}
            >
              {enroll.isPending ? "Saving…" : "Start this track"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <section
            className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Learning progress"
          >
            <Metric
              icon={Flame}
              label="Current streak"
              value={`${data?.streak?.current_streak ?? 0} days`}
            />
            <Metric
              icon={Target}
              label="Daily goal"
              value={
                today ? `${today.completed_minutes} / ${today.target_minutes} min` : "0 / 15 min"
              }
            />
            <Metric icon={Award} label="Studio XP" value={String(data?.streak?.total_xp ?? 0)} />
            <Metric icon={BookOpen} label="Track progress" value={`${percent}%`} />
          </section>
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="mb-2 flex justify-between text-sm">
                <span>Overall progress</span>
                <span>{percent}%</span>
              </div>
              <Progress value={percent} aria-label={`${percent}% completed`} />
            </CardContent>
          </Card>
          <section className="mt-8">
            <h2 className="font-display text-2xl">Next activities</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {lessons.map((lesson) => {
                const track = tracks.find((item) => item.id === lesson.track_id);
                const locked = lesson.premium && !subscription.data?.isPremium;
                return (
                  <Card key={lesson.id} className="min-w-0">
                    <CardContent className="flex h-full flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Badge variant="outline">{track?.title}</Badge>
                          <h3 className="mt-3 text-lg font-semibold">{lesson.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{lesson.description}</p>
                        </div>
                        {completed.has(lesson.id) ? (
                          <CheckCircle2 className="shrink-0 text-success" aria-label="Completed" />
                        ) : locked ? (
                          <LockKeyhole
                            className="shrink-0 text-muted-foreground"
                            aria-label="Premium"
                          />
                        ) : (
                          <Sparkles className="shrink-0 text-gold" />
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{lesson.lesson_type}</span>
                        <span>·</span>
                        <span>{lesson.estimated_minutes} min</span>
                        <span>·</span>
                        <span className="capitalize">{lesson.difficulty}</span>
                      </div>
                      <Button
                        className="mt-5 min-h-11 w-full"
                        variant={completed.has(lesson.id) ? "outline" : "default"}
                        onClick={async () => {
                          if (locked) {
                            navigate({ to: "/premium" });
                            return;
                          }
                          await StudioService.startLesson(lesson.id);
                          setOpenLesson(lesson);
                        }}
                      >
                        {locked
                          ? "Unlock with NEXORA Premium"
                          : completed.has(lesson.id)
                            ? "Review lesson"
                            : "Open lesson"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </>
      )}
      {openLesson && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-background/95 p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lesson-title"
        >
          <div className="mx-auto my-4 max-w-2xl rounded-2xl border bg-background p-5 shadow-xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge>{openLesson.lesson_type}</Badge>
                <h2 id="lesson-title" className="mt-3 font-display text-3xl">
                  {openLesson.title}
                </h2>
              </div>
              <Button variant="ghost" onClick={() => setOpenLesson(null)}>
                Close
              </Button>
            </div>
            <LessonBlock title="Explanation" text={openLesson.content.explanation} />
            <LessonBlock title="Example" text={openLesson.content.example} />
            <LessonBlock title="Exercise" text={openLesson.content.exercise} />
            <LessonBlock title="Practical task" text={openLesson.content.practicalTask} />
            <Label htmlFor="lesson-answer" className="mt-6 block">
              Your response
            </Label>
            <Textarea
              id="lesson-answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              className="mt-2 min-h-32"
              placeholder="Write your answer here…"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Your exercise text is not copied into activity logs.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              {category === "creator" && (
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate({
                      to: "/content",
                      search: { prompt: openLesson.content.practicalTask ?? openLesson.title },
                    })
                  }
                >
                  <WandSparkles className="mr-2 h-4 w-4" />
                  Send to Content Studio
                </Button>
              )}
              <Button
                disabled={answer.trim().length < 3 || complete.isPending}
                onClick={() => complete.mutate(openLesson.id)}
              >
                {complete.isPending ? "Saving…" : "Complete lesson"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Timer;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <Icon className="h-5 w-5 text-gold" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
function LessonBlock({ title, text }: { title: string; text?: string }) {
  return (
    <section className="mt-6">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 leading-7 text-muted-foreground">
        {text ?? "Complete the guided activity."}
      </p>
    </section>
  );
}
