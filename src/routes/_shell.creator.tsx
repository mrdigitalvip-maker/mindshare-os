import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AIService } from "@/services/ai-service";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CREATOR_ACADEMY,
  CREATOR_METRICS,
  CREATOR_PLATFORMS,
  creatorNextAction,
} from "@/lib/creator";
import type { CreatorContent, CreatorProfile, CreatorStrategy } from "@/lib/creator";
import {
  appendCreatorMetricSnapshot,
  createCreatorTask,
  createCreatorVideoProject,
  deleteCreatorContent,
  deleteCreatorGoal,
  emptyCreatorProfile,
  listCreatorResources,
  loadCreatorProfile,
  loadCreatorStrategy,
  saveCreatorContent,
  saveCreatorCountry,
  saveCreatorGoal,
  saveCreatorProfile,
  saveCreatorStrategy,
  setLessonCompletion,
  signedCreatorOutput,
} from "@/services/creator-service";

export const Route = createFileRoute("/_shell/creator")({
  head: () => ({ meta: [{ title: "Creator Center — NEXORA" }] }),
  component: CreatorCenter,
});

const sections = ["CREATE", "PLAN", "LEARN", "ANALYZE", "INTELLIGENCE", "MEDIA", "AI"];
const split = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
const Field = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="space-y-1">
    <Label>{label}</Label>
    <Input value={value} onChange={(event) => onChange(event.target.value)} />
  </div>
);

function CreatorCenter() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [profile, setProfile] = useState<CreatorProfile>(emptyCreatorProfile);
  const [strategy, setStrategy] = useState<CreatorStrategy>({
    platform: "instagram",
    niche: "",
    goal: "build_brand",
    publishingFrequency: 1,
    targetMarkets: [],
    preferredContentFormats: [],
    contentPillars: [],
  });
  const [resources, setResources] = useState<Record<string, Record<string, unknown>[]>>({});
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState("");
  const [milestones, setMilestones] = useState("");
  const [content, setContent] = useState<CreatorContent>({
    platform: "instagram",
    contentType: "video",
    title: "",
    publishedAt: new Date().toISOString().slice(0, 16),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [country, setCountry] = useState({
    platform: "instagram",
    countryIso: "",
    countryName: "",
    metricContext: "audience_percentage",
    value: "",
    period: "",
    notes: "",
  });
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantResult, setAssistantResult] = useState("");

  const reload = useCallback(async () => {
    if (!userId) return;
    const [savedProfile, savedStrategy, savedResources] = await Promise.all([
      loadCreatorProfile(userId),
      loadCreatorStrategy(userId),
      listCreatorResources(userId),
    ]);
    if (savedProfile) setProfile(savedProfile);
    if (savedStrategy) setStrategy(savedStrategy);
    setResources(savedResources);
    setLoading(false);
  }, [userId]);
  useEffect(() => {
    void reload().catch(() => {
      setLoading(false);
      toast.error("Creator data is temporarily unavailable. Retry when ready.");
    });
  }, [reload]);

  const action = useMemo(
    () =>
      creatorNextAction({
        hasProfile: Boolean(resources.creator_profiles?.length || profile.niche),
        hasStrategy: Boolean(resources.creator_strategies?.length || strategy.niche),
        contentCount: resources.creator_content_log?.length ?? 0,
        metricSnapshotCount: resources.creator_manual_metric_snapshots?.length ?? 0,
      }),
    [profile.niche, resources, strategy.niche],
  );
  const mutate = async (work: () => Promise<unknown>, message: string) => {
    try {
      await work();
      await reload();
      toast.success(message);
    } catch {
      toast.error("Could not save. Your existing data is unchanged.");
    }
  };
  const updateProfile = <K extends keyof CreatorProfile>(key: K, value: CreatorProfile[K]) =>
    setProfile((current) => ({ ...current, [key]: value }));

  const askAssistant = async (mode: "ideas" | "hooks" | "copilot") => {
    setAssistantResult("");
    try {
      const context = {
        profile: profile.niche ? profile : undefined,
        strategy: strategy.niche ? strategy : undefined,
        goals: resources.creator_goals ?? [],
        contentHistory: resources.creator_content_log ?? [],
        manualMetrics: resources.creator_manual_metric_snapshots ?? [],
      };
      const result = await AIService.sendChat({
        message: `Creator ${mode}. Request: ${assistantInput}\nAvailable creator context: ${JSON.stringify(context)}`,
        conversationId: null,
        requestId: crypto.randomUUID(),
      });
      setAssistantResult(result.assistantMessage.content);
    } catch {
      setAssistantResult("NEXORA Assistant is unavailable right now. Please retry later.");
    }
  };

  if (loading) return <p className="p-6 text-muted-foreground">Loading your Creator Center…</p>;
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          NEXORA
        </p>
        <h1 className="font-display text-4xl">Creator Center</h1>
        <p className="mt-2 text-muted-foreground">
          Idea → positioning → profile → strategy → content → publish → record results → analyze →
          improve.
        </p>
        <nav aria-label="Creator Center sections" className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {sections.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="rounded-full border px-3 py-2 text-xs font-semibold"
            >
              {item}
            </a>
          ))}
        </nav>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Next action</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p>{action.label}</p>
          <Button
            onClick={() =>
              document.getElementById(action.section)?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Continue
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              void mutate(() => createCreatorTask(action.label), "Added to canonical Tasks")
            }
          >
            Add to Tasks
          </Button>
        </CardContent>
      </Card>

      <section id="create" className="space-y-5 scroll-mt-24">
        <h2 className="font-display text-3xl">Create</h2>
        <Card id="setup">
          <CardHeader>
            <CardTitle>Creator Setup & Profile Builder</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Experience level</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3"
                value={profile.experience}
                onChange={(e) => updateProfile("experience", e.target.value)}
              >
                <option value="beginner">Beginner</option>
                <option value="creator">Creator</option>
                <option value="professional">Professional</option>
              </select>
            </div>
            <Field
              label="Platform targets (comma separated)"
              value={profile.platforms.join(", ")}
              onChange={(v) => updateProfile("platforms", split(v))}
            />
            <Field
              label="Niche"
              value={profile.niche}
              onChange={(v) => updateProfile("niche", v)}
            />
            <Field label="Goal" value={profile.goal} onChange={(v) => updateProfile("goal", v)} />
            <Field
              label="Primary audience region"
              value={profile.primaryAudienceRegion}
              onChange={(v) => updateProfile("primaryAudienceRegion", v)}
            />
            <div className="space-y-1">
              <Label>Weekly posting capacity</Label>
              <Input
                type="number"
                min={1}
                value={profile.weeklyPostingCapacity}
                onChange={(e) => updateProfile("weeklyPostingCapacity", Number(e.target.value))}
              />
            </div>
            <Field
              label="Display name"
              value={profile.displayName}
              onChange={(v) => updateProfile("displayName", v)}
            />
            <Field
              label="Username ideas workspace"
              value={profile.usernameIdeas.join(", ")}
              onChange={(v) => updateProfile("usernameIdeas", split(v))}
            />
            <Field label="Bio" value={profile.bio} onChange={(v) => updateProfile("bio", v)} />
            <Field
              label="Positioning"
              value={profile.positioning}
              onChange={(v) => updateProfile("positioning", v)}
            />
            <Field
              label="Category"
              value={profile.category}
              onChange={(v) => updateProfile("category", v)}
            />
            <Field
              label="Call to action"
              value={profile.callToAction}
              onChange={(v) => updateProfile("callToAction", v)}
            />
            <Field
              label="Content pillars (ordered, comma separated)"
              value={profile.contentPillars.join(", ")}
              onChange={(v) => updateProfile("contentPillars", split(v))}
            />
            <Field
              label="Keywords"
              value={profile.keywords.join(", ")}
              onChange={(v) => updateProfile("keywords", split(v))}
            />
            <Field
              label="Brand tone"
              value={profile.brandTone}
              onChange={(v) => updateProfile("brandTone", v)}
            />
            <Field
              label="Visual direction"
              value={profile.visualDirection}
              onChange={(v) => updateProfile("visualDirection", v)}
            />
            <Button
              className="md:col-span-2"
              onClick={() =>
                void mutate(() => saveCreatorProfile(userId, profile), "Creator profile saved")
              }
            >
              Save setup and profile
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Manual Content Log</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Field
              label="Internal title / label"
              value={content.title}
              onChange={(v) => setContent({ ...content, title: v })}
            />
            <Field
              label="Platform"
              value={content.platform}
              onChange={(v) => setContent({ ...content, platform: v })}
            />
            <Field
              label="Content type"
              value={content.contentType}
              onChange={(v) => setContent({ ...content, contentType: v })}
            />
            <Field
              label="Published at"
              value={content.publishedAt}
              onChange={(v) => setContent({ ...content, publishedAt: v })}
            />
            <Field
              label="Timezone"
              value={content.timezone}
              onChange={(v) => setContent({ ...content, timezone: v })}
            />
            <Field
              label="Optional URL / reference"
              value={content.referenceUrl ?? ""}
              onChange={(v) => setContent({ ...content, referenceUrl: v })}
            />
            <Field
              label="Optional content pillar"
              value={content.contentPillar ?? ""}
              onChange={(v) => setContent({ ...content, contentPillar: v })}
            />
            <Field
              label="Optional duration (ms)"
              value={String(content.durationMs ?? "")}
              onChange={(v) => setContent({ ...content, durationMs: v ? Number(v) : undefined })}
            />
            <div className="space-y-1 md:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={content.notes ?? ""}
                onChange={(e) => setContent({ ...content, notes: e.target.value })}
              />
            </div>
            <Button
              onClick={() =>
                void mutate(
                  () =>
                    saveCreatorContent(userId, {
                      ...content,
                      publishedAt: new Date(content.publishedAt).toISOString(),
                    }),
                  "Content saved",
                )
              }
            >
              Save content
            </Button>
          </CardContent>
        </Card>
        <div className="grid gap-3">
          {(resources.creator_content_log ?? []).map((row) => (
            <Card key={String(row.id)}>
              <CardContent className="flex items-center justify-between gap-3 pt-6">
                <div>
                  <strong>{String(row.title)}</strong>
                  <p className="text-sm text-muted-foreground">
                    {String(row.platform)} · {String(row.content_type)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setContent({
                        id: String(row.id),
                        platform: String(row.platform),
                        contentType: String(row.content_type),
                        title: String(row.title),
                        publishedAt: String(row.published_at).slice(0, 16),
                        timezone: String(row.timezone),
                        referenceUrl:
                          typeof row.reference_url === "string" ? row.reference_url : undefined,
                        contentPillar:
                          typeof row.content_pillar === "string" ? row.content_pillar : undefined,
                        durationMs:
                          typeof row.duration_ms === "number" ? row.duration_ms : undefined,
                        notes: typeof row.notes === "string" ? row.notes : undefined,
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      void mutate(
                        () => deleteCreatorContent(userId, String(row.id)),
                        "Content entry deleted",
                      )
                    }
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="plan" className="space-y-5 scroll-mt-24">
        <h2 className="font-display text-3xl">Plan</h2>
        <Card id="strategy">
          <CardHeader>
            <CardTitle>Content Strategy</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Field
              label="Platform"
              value={strategy.platform}
              onChange={(v) => setStrategy({ ...strategy, platform: v })}
            />
            <Field
              label="Niche"
              value={strategy.niche}
              onChange={(v) => setStrategy({ ...strategy, niche: v })}
            />
            <Field
              label="Goal"
              value={strategy.goal}
              onChange={(v) => setStrategy({ ...strategy, goal: v })}
            />
            <div>
              <Label>Publishing frequency</Label>
              <Input
                type="number"
                min={1}
                value={strategy.publishingFrequency}
                onChange={(e) =>
                  setStrategy({ ...strategy, publishingFrequency: Number(e.target.value) })
                }
              />
            </div>
            <Field
              label="Target markets"
              value={strategy.targetMarkets.join(", ")}
              onChange={(v) => setStrategy({ ...strategy, targetMarkets: split(v) })}
            />
            <Field
              label="Formats"
              value={strategy.preferredContentFormats.join(", ")}
              onChange={(v) => setStrategy({ ...strategy, preferredContentFormats: split(v) })}
            />
            <Field
              label="Content pillars"
              value={strategy.contentPillars.join(", ")}
              onChange={(v) => setStrategy({ ...strategy, contentPillars: split(v) })}
            />
            <Button
              onClick={() =>
                void mutate(() => saveCreatorStrategy(userId, strategy), "Strategy saved")
              }
            >
              Save strategy
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Creator Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Goal title" value={goal} onChange={setGoal} />
            <Field
              label="Manual milestones (comma separated)"
              value={milestones}
              onChange={setMilestones}
            />
            <Button
              onClick={() =>
                void mutate(() => saveCreatorGoal(userId, goal, split(milestones)), "Goal saved")
              }
            >
              Create goal
            </Button>
            {(resources.creator_goals ?? []).map((row) => (
              <div
                key={String(row.id)}
                className="flex items-center justify-between rounded border p-3"
              >
                <span>{String(row.title)}</span>
                <Button
                  variant="outline"
                  onClick={() =>
                    void mutate(() => deleteCreatorGoal(userId, String(row.id)), "Goal deleted")
                  }
                >
                  Delete
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section id="learn" className="space-y-4 scroll-mt-24">
        <h2 className="font-display text-3xl">Learn</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {Object.entries(CREATOR_ACADEMY).map(([level, lessons]) => (
            <Card key={level}>
              <CardHeader>
                <CardTitle>{level}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lessons.map((lesson) => {
                  const key = `${level.toLowerCase()}:${lesson.toLowerCase().replaceAll(" ", "_")}`;
                  const done = (resources.creator_learning_progress ?? []).some(
                    (row) => row.lesson_key === key,
                  );
                  return (
                    <label key={lesson} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={(e) =>
                          void mutate(
                            () => setLessonCompletion(userId, key, e.target.checked),
                            "Academy progress saved",
                          )
                        }
                      />
                      {lesson}
                    </label>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="analyze" className="space-y-4 scroll-mt-24">
        <h2 className="font-display text-3xl">Analyze</h2>
        <Card id="analytics">
          <CardHeader>
            <CardTitle>Manual analytics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {CREATOR_METRICS.map((metric) => (
              <Field
                key={metric}
                label={metric.replaceAll("_", " ")}
                value={metrics[metric] ?? ""}
                onChange={(v) => setMetrics({ ...metrics, [metric]: v })}
              />
            ))}
            <Button
              disabled={!resources.creator_content_log?.[0]}
              onClick={() =>
                void mutate(
                  () =>
                    appendCreatorMetricSnapshot(userId, resources.creator_content_log[0], metrics),
                  "New observation appended",
                )
              }
            >
              Append snapshot
            </Button>
            <p className="text-sm text-muted-foreground md:col-span-3">
              Blank values remain unknown. A value of 0 is recorded as an authoritative zero.
              Historical snapshots are never overwritten.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Real observations only</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Known content: {resources.creator_content_log?.length ?? 0}</p>
            <p>Metric observations: {resources.creator_manual_metric_snapshots?.length ?? 0}</p>
            {(resources.creator_manual_metric_snapshots?.length ?? 0) < 3 && (
              <p className="text-muted-foreground">
                More observations are needed before weekday or best posting-window comparisons can
                be made.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section id="intelligence" className="space-y-4 scroll-mt-24">
        <h2 className="font-display text-3xl">Intelligence</h2>
        <Card>
          <CardHeader>
            <CardTitle>Manual country intelligence</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {Object.entries(country).map(([key, value]) => (
              <Field
                key={key}
                label={key.replace(/([A-Z])/g, " $1")}
                value={value}
                onChange={(v) => setCountry({ ...country, [key]: v })}
              />
            ))}
            <Button
              onClick={() =>
                void mutate(
                  () => saveCreatorCountry(userId, country),
                  "Manual country observation saved",
                )
              }
            >
              Save observation
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Creator Map</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">Manual audience / performance data</p>
            {(resources.creator_manual_country_observations ?? []).map((row) => (
              <p key={String(row.id)} className="mt-2 rounded border p-3">
                {String(row.country_name)} · {String(row.value)}{" "}
                <span className="text-muted-foreground">— Manually entered data</span>
              </p>
            ))}
            <p className="mt-4 text-sm text-muted-foreground">
              Provider-verified data: not connected. Global benchmark: no benchmark data is
              available yet.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="media" className="space-y-4 scroll-mt-24">
        <h2 className="font-display text-3xl">Media</h2>
        <Card>
          <CardHeader>
            <CardTitle>Creator Library & Viral Clips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              Processing uses the canonical private backend worker. Availability depends on
              deployment; the browser never runs FFmpeg.
            </p>
            <Label htmlFor="creator-video">Select local video</Label>
            <Input
              id="creator-video"
              type="file"
              accept="video/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file)
                  void mutate(
                    () => createCreatorVideoProject({ userId, title: file.name, file }),
                    "Video uploaded and canonical job requested",
                  );
              }}
            />
            {(resources.creator_projects ?? []).map((project) => (
              <div key={String(project.id)} className="rounded border p-3">
                <strong>{String(project.title)}</strong>
                <p className="text-sm text-muted-foreground">{String(project.status)}</p>
                {Boolean(project.output_path) && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void signedCreatorOutput(String(project.output_path)).then((url) =>
                        window.open(url, "_blank", "noopener,noreferrer"),
                      )
                    }
                  >
                    Authorized download
                  </Button>
                )}
              </div>
            ))}
            {(resources.creator_jobs ?? []).map((job) => (
              <p key={String(job.id)} className="rounded border p-3 text-sm">
                Job stage: {String(job.progress_stage ?? job.status)}
              </p>
            ))}
            {(resources.creator_clips ?? []).map((clip) => (
              <div
                key={String(clip.id)}
                className="flex items-center justify-between rounded border p-3"
              >
                <span>
                  Real clip #{String(clip.rank)} · {String(clip.render_status)}
                </span>
                {Boolean(clip.output_path) && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void signedCreatorOutput(String(clip.output_path)).then((url) =>
                        window.open(url, "_blank", "noopener,noreferrer"),
                      )
                    }
                  >
                    Authorized download
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section id="ai" className="space-y-4 scroll-mt-24">
        <h2 className="font-display text-3xl">AI</h2>
        <Card>
          <CardHeader>
            <CardTitle>NEXORA Assistant for Creators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="creator-ai">Topic, audience, goal and tone</Label>
            <Textarea
              id="creator-ai"
              value={assistantInput}
              onChange={(e) => setAssistantInput(e.target.value)}
              placeholder="Describe what you want to create…"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void askAssistant("ideas")}>Content Ideas</Button>
              <Button variant="outline" onClick={() => void askAssistant("hooks")}>
                Hook Lab
              </Button>
              <Button variant="outline" onClick={() => void askAssistant("copilot")}>
                Creator Copilot
              </Button>
            </div>
            {assistantResult && (
              <div role="status" className="whitespace-pre-wrap rounded border p-4">
                {assistantResult}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
