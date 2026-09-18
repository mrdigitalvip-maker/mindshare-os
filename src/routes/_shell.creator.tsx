import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Bot,
  CheckCircle2,
  ExternalLink,
  Film,
  GraduationCap,
  Link2,
  Loader2,
  RefreshCw,
  Scissors,
  Settings2,
  Unplug,
  Upload,
  WandSparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AIService } from "@/services/ai-service";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/providers/language-provider";
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
  cancelCreatorJob,
  createCreatorTask,
  createCreatorVideoProject,
  deleteCreatorContent,
  deleteCreatorGoal,
  emptyCreatorProfile,
  importCreatorVideoFromUrl,
  inspectCreatorYouTubeUrl,
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
  rerenderCreatorClip,
  startCreatorProviderConnection,
  syncCreatorProviderAnalytics,
  disconnectCreatorProvider,
} from "@/services/creator-service";
import type { CreatorProvider, CreatorYouTubeMetadata } from "@/services/creator-service";

export const Route = createFileRoute("/_shell/creator")({
  head: () => ({ meta: [{ title: "Creator Studio — KIVRYN" }] }),
  component: CreatorStudio,
});

const sections = ["CREATE", "PLAN", "LEARN", "ANALYZE", "INTELLIGENCE", "MEDIA", "AI"];
const CREATOR_WORKFLOW =
  "Idea → positioning → profile → strategy → content → publish → record results → analyze → improve";

const split = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const Field = ({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
  </div>
);

function isYouTubeUrl(value: string) {
  try {
    const host = new URL(value.trim()).hostname.toLowerCase();
    return ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"].includes(
      host,
    );
  } catch {
    return false;
  }
}

function formatBytes(value: unknown) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type ClipRerenderDraft = {
  startSeconds: string;
  endSeconds: string;
  aspectRatio: "9:16" | "1:1" | "16:9";
  captionsEnabled: boolean;
};

function metricRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1]),
    ),
  );
}

function creatorJobActive(status: unknown) {
  return ["queued", "analyzing", "transcribing", "selecting_clips", "rendering"].includes(
    String(status),
  );
}

function CreatorStudio() {
  const { user } = useAuth();
  const { t } = useLanguage();
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
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceAuthorized, setSourceAuthorized] = useState(false);
  const [sourceBusy, setSourceBusy] = useState(false);
  const [youtubeMetadata, setYoutubeMetadata] = useState<CreatorYouTubeMetadata | null>(null);
  const [cancelConfirmJobId, setCancelConfirmJobId] = useState<string | null>(null);
  const [rerenderDrafts, setRerenderDrafts] = useState<Record<string, ClipRerenderDraft>>({});
  const [providerBusy, setProviderBusy] = useState<string | null>(null);
  const [disconnectConfirmId, setDisconnectConfirmId] = useState<string | null>(null);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const current = new URL(window.location.href);
    const connectionStatus = current.searchParams.get("creator_connection");
    const connectionError = current.searchParams.get("error");
    if (!connectionStatus && !connectionError) return;
    if (connectionStatus === "connected") {
      toast.success("Creator provider connected. Sync analytics when ready.");
    } else if (connectionError) {
      toast.error(`Provider connection failed: ${connectionError.replaceAll("_", " ")}.`);
    }
    current.searchParams.delete("creator_connection");
    current.searchParams.delete("error");
    window.history.replaceState({}, "", `${current.pathname}${current.search}${current.hash}`);
    void reload();
  }, [reload]);

  const action = useMemo(
    () =>
      creatorNextAction({
        hasProfile: Boolean(profile.niche),
        hasStrategy: Boolean(strategy.niche),
        contentCount: resources.creator_content_log?.length ?? 0,
        metricSnapshotCount: resources.creator_manual_metric_snapshots?.length ?? 0,
      }),
    [profile.niche, resources, strategy.niche],
  );

  const projectCount = resources.creator_projects?.length ?? 0;
  const clipCount = resources.creator_clips?.length ?? 0;
  const creatorJobs = useMemo(
    () =>
      [...(resources.creator_jobs ?? [])].sort(
        (a, b) =>
          Date.parse(String(b.created_at ?? 0)) - Date.parse(String(a.created_at ?? 0)),
      ),
    [resources.creator_jobs],
  );
  const activeJobs = creatorJobs.filter((job) => creatorJobActive(job.status)).length;
  const providerConnections = resources.creator_platform_connections ?? [];
  const providerAnalytics = useMemo(() => {
    const snapshots = resources.creator_analytics_snapshots ?? [];
    const latest = new Map<string, Record<string, unknown>>();
    for (const snapshot of snapshots) {
      const contentId = String(snapshot.provider_content_id ?? "");
      if (!contentId) continue;
      const current = latest.get(contentId);
      if (
        !current ||
        Date.parse(String(snapshot.captured_at ?? 0)) >
          Date.parse(String(current.captured_at ?? 0))
      ) {
        latest.set(contentId, snapshot);
      }
    }
    return (resources.creator_analytics_content ?? [])
      .map((item) => {
        const snapshot = latest.get(String(item.provider_content_id ?? ""));
        return {
          content: item,
          snapshot,
          metrics: metricRecord(snapshot?.metrics),
        };
      })
      .sort(
        (a, b) =>
          Date.parse(String(b.content.published_at ?? 0)) -
          Date.parse(String(a.content.published_at ?? 0)),
      );
  }, [resources.creator_analytics_content, resources.creator_analytics_snapshots]);
  const maxProviderViews = Math.max(
    0,
    ...providerAnalytics
      .map((row) => row.metrics.views)
      .filter((value): value is number => typeof value === "number"),
  );

  const mutate = async (work: () => Promise<unknown>, message: string) => {
    try {
      await work();
      await reload();
      toast.success(message);
    } catch (error) {
      console.error("creator_mutation_failed", error);
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
        creatorProjects: resources.creator_projects ?? [],
      };
      const result = await AIService.sendChat({
        message: `Creator ${mode}. Request: ${assistantInput}\nAvailable creator context: ${JSON.stringify(context)}`,
        conversationId: null,
        requestId: crypto.randomUUID(),
      });
      setAssistantResult(result.assistantMessage.content);
    } catch {
      setAssistantResult("KIVRYN Assistant is unavailable right now. Please retry later.");
    }
  };

  const handleUrlSource = async () => {
    if (!sourceUrl.trim()) {
      toast.error("Paste a source URL first.");
      return;
    }
    setSourceBusy(true);
    setYoutubeMetadata(null);
    try {
      if (isYouTubeUrl(sourceUrl)) {
        const metadata = await inspectCreatorYouTubeUrl(sourceUrl);
        setYoutubeMetadata(metadata);
        setSourceTitle((current) => current || metadata.title);
        toast.success("YouTube source recognized. Upload the original video to create clips.");
        return;
      }
      if (!sourceAuthorized) {
        toast.error("Confirm that you own or are authorized to process this video.");
        return;
      }
      await importCreatorVideoFromUrl({
        url: sourceUrl,
        title: sourceTitle || undefined,
        confirmedRights: sourceAuthorized,
        aspectRatio: "9:16",
        targetDurationSeconds: 30,
        captionsEnabled: true,
      });
      setSourceUrl("");
      setSourceTitle("");
      setSourceAuthorized(false);
      await reload();
      toast.success("Source imported. KIVRYN queued the real clipping job.");
    } catch (error) {
      console.error("creator_source_url_failed", error);
      toast.error(
        isYouTubeUrl(sourceUrl)
          ? "Could not inspect this YouTube link. Try again or upload the original video."
          : "This URL could not be imported. Use a direct HTTPS video link or upload the file.",
      );
    } finally {
      setSourceBusy(false);
    }
  };

  const handleLocalFile = async (file: File) => {
    setSourceBusy(true);
    try {
      await createCreatorVideoProject({ userId, title: file.name, file });
      await reload();
      toast.success("Video uploaded. KIVRYN queued the real clipping job.");
    } catch (error) {
      console.error("creator_local_upload_failed", error);
      toast.error("The video could not be uploaded. No fake processing state was created.");
    } finally {
      setSourceBusy(false);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (cancelConfirmJobId !== jobId) {
      setCancelConfirmJobId(jobId);
      return;
    }
    try {
      await cancelCreatorJob(jobId);
      setCancelConfirmJobId(null);
      await reload();
      toast.success("Creator processing cancelled.");
    } catch (error) {
      console.error("creator_job_cancel_failed", error);
      toast.error("This Creator job could not be cancelled.");
    }
  };

  const draftForClip = (clip: Record<string, unknown>): ClipRerenderDraft =>
    rerenderDrafts[String(clip.id)] ?? {
      startSeconds: String(Number(clip.start_ms ?? 0) / 1000),
      endSeconds: String(Number(clip.end_ms ?? 0) / 1000),
      aspectRatio:
        clip.aspect_ratio === "1:1" || clip.aspect_ratio === "16:9" ? clip.aspect_ratio : "9:16",
      captionsEnabled: clip.captions_enabled !== false,
    };

  const updateClipDraft = (
    clip: Record<string, unknown>,
    patch: Partial<ClipRerenderDraft>,
  ) => {
    const id = String(clip.id);
    setRerenderDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] ?? draftForClip(clip)), ...patch },
    }));
  };

  const handleRerenderClip = async (clip: Record<string, unknown>) => {
    const id = String(clip.id);
    const draft = draftForClip(clip);
    try {
      await rerenderCreatorClip({
        clipId: id,
        startMs: Math.round(Number(draft.startSeconds) * 1000),
        endMs: Math.round(Number(draft.endSeconds) * 1000),
        aspectRatio: draft.aspectRatio,
        captionsEnabled: draft.captionsEnabled,
      });
      await reload();
      toast.success("Rerender queued in the canonical Creator worker.");
    } catch (error) {
      console.error("creator_rerender_failed", error);
      toast.error("Could not queue this rerender. Check the clip range and retry.");
    }
  };

  const handleConnectProvider = async (provider: CreatorProvider) => {
    if (typeof window === "undefined") return;
    setProviderBusy(provider);
    try {
      const authorizationUrl = await startCreatorProviderConnection({
        provider,
        redirectUri: `${window.location.origin}/creator`,
      });
      window.location.assign(authorizationUrl);
    } catch (error) {
      console.error("creator_provider_connect_failed", error);
      toast.error(
        provider === "youtube"
          ? "YouTube connection is not configured or available."
          : "TikTok connection requires an approved provider app.",
      );
      setProviderBusy(null);
    }
  };

  const handleSyncProvider = async (connectionId?: string) => {
    setProviderBusy(connectionId ?? "all");
    try {
      const result = await syncCreatorProviderAnalytics(connectionId);
      await reload();
      toast.success(
        `Provider analytics synced: ${result.content ?? 0} content records, ${result.snapshots ?? 0} new snapshots.`,
      );
    } catch (error) {
      console.error("creator_analytics_sync_failed", error);
      toast.error("Provider analytics could not be synced.");
    } finally {
      setProviderBusy(null);
    }
  };

  const handleDisconnectProvider = async (connectionId: string) => {
    if (disconnectConfirmId !== connectionId) {
      setDisconnectConfirmId(connectionId);
      return;
    }
    setProviderBusy(connectionId);
    try {
      await disconnectCreatorProvider(connectionId);
      setDisconnectConfirmId(null);
      await reload();
      toast.success("Provider disconnected. Existing analytics history was retained.");
    } catch (error) {
      console.error("creator_provider_disconnect_failed", error);
      toast.error("Provider could not be disconnected.");
    } finally {
      setProviderBusy(null);
    }
  };

  if (loading) return <p className="p-6 text-muted-foreground">{t("creator.loading")}</p>;

  return (
    <main
      className="creator-studio relative z-10 mx-auto max-w-[1320px] space-y-6 p-4 md:p-8"
      data-workflow={CREATOR_WORKFLOW}
      data-sections={sections.join(",")}
    >
      <header className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            KIVRYN · CREATOR STUDIO
          </p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">Create from the source, not the clutter.</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
            Bring the video first. KIVRYN keeps the source private, sends it through the canonical
            clipping pipeline and shows only real projects, jobs and outputs.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatusCard label="Sources" value={projectCount} detail="real creator projects" />
          <StatusCard label="Processing" value={activeJobs} detail="active backend jobs" />
          <StatusCard label="Clips" value={clipCount} detail="rendered outputs" />
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Standalone Creator works without social credentials. Social publishing integrations are not connected
          unless a verified provider connection is configured.
        </p>
      </header>

      <section id="media" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-intelligence" />
          <h2 className="font-display text-3xl">Source workspace</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <Card className="overflow-hidden border-intelligence/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" /> Paste a video source
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="creator-source-url">Video URL</Label>
                <Input
                  id="creator-source-url"
                  type="url"
                  inputMode="url"
                  value={sourceUrl}
                  onChange={(event) => {
                    setSourceUrl(event.target.value);
                    setYoutubeMetadata(null);
                  }}
                  placeholder="https://…"
                />
              </div>
              <Field label="Optional project title" value={sourceTitle} onChange={setSourceTitle} />
              {!isYouTubeUrl(sourceUrl) && (
                <label className="flex items-start gap-3 rounded-xl border border-border bg-surface/60 p-3 text-sm">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={sourceAuthorized}
                    onChange={(event) => setSourceAuthorized(event.target.checked)}
                  />
                  <span>
                    I own this video or have permission to process it. KIVRYN imports only a direct
                    HTTPS video source into my private Creator storage.
                  </span>
                </label>
              )}
              <Button
                className="min-h-11 w-full"
                disabled={sourceBusy || !sourceUrl.trim()}
                onClick={() => void handleUrlSource()}
              >
                {sourceBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isYouTubeUrl(sourceUrl) ? (
                  <WandSparkles className="h-4 w-4" />
                ) : (
                  <Film className="h-4 w-4" />
                )}
                {isYouTubeUrl(sourceUrl) ? "Analyze YouTube link" : "Import & create clips"}
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                Direct HTTPS video files can enter the real clipping pipeline. YouTube links are
                inspected with the official metadata integration; downloading the platform video is
                not presented as available, so the original file is required.
              </p>
              {youtubeMetadata && (
                <div className="grid gap-3 rounded-2xl border border-border bg-surface/60 p-3 sm:grid-cols-[120px_1fr]">
                  {youtubeMetadata.thumbnailUrl ? (
                    <img
                      src={youtubeMetadata.thumbnailUrl}
                      alt=""
                      className="aspect-video w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="grid aspect-video place-items-center rounded-xl bg-background">
                      <Film className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold">{youtubeMetadata.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {youtubeMetadata.channelTitle}
                      {youtubeMetadata.durationSeconds
                        ? ` · ${Math.round(youtubeMetadata.durationSeconds / 60)} min`
                        : ""}
                    </p>
                    <p className="mt-2 text-xs font-medium text-amber-300">
                      Original upload required before clipping.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" /> Upload original
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                Best for YouTube/TikTok exports, large originals or any source that is not a direct
                video URL.
              </p>
              <Label
                htmlFor="creator-video"
                className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 px-5 text-center transition hover:border-foreground/30"
              >
                <Upload className="mb-3 h-7 w-7 text-muted-foreground" />
                <span className="font-medium">Choose a video file</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  The browser uploads it to your private Creator source bucket.
                </span>
              </Label>
              <Input
                id="creator-video"
                className="sr-only"
                type="file"
                accept="video/*"
                disabled={sourceBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleLocalFile(file);
                  event.currentTarget.value = "";
                }}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_.72fr]">
        <Card>
          <CardHeader>
            <CardTitle>Creator pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(resources.creator_projects ?? []).length === 0 && (
              <EmptyState text="No source project yet. Paste a direct video URL or upload an original above." />
            )}
            {(resources.creator_projects ?? []).map((project) => {
              const relatedJobs = (resources.creator_jobs ?? []).filter(
                (job) => String(job.project_id) === String(project.id),
              );
              const latestJob = relatedJobs.at(-1);
              return (
                <div key={String(project.id)} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{String(project.title)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {String(project.source_type).replaceAll("_", " ")} · {String(project.status)}
                        {formatBytes(project.source_size_bytes)
                          ? ` · ${formatBytes(project.source_size_bytes)}`
                          : ""}
                      </p>
                    </div>
                    <StatusPill value={String(latestJob?.progress_stage ?? project.status)} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WandSparkles className="h-5 w-5" /> Next best action
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-lg font-medium">{action.label}</p>
            <div className="flex flex-wrap gap-2">
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
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="ai" className="scroll-mt-24">
        <Card className="border-intelligence/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" /> KIVRYN Creator Copilot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="creator-ai">Topic, audience, goal and tone</Label>
            <Textarea
              id="creator-ai"
              value={assistantInput}
              onChange={(event) => setAssistantInput(event.target.value)}
              placeholder="Describe what you want to create…"
            />
            <div className="flex flex-wrap gap-2">
              <Button disabled={!assistantInput.trim()} onClick={() => void askAssistant("ideas")}>
                Content Ideas
              </Button>
              <Button
                disabled={!assistantInput.trim()}
                variant="outline"
                onClick={() => void askAssistant("hooks")}
              >
                Hook Lab
              </Button>
              <Button
                disabled={!assistantInput.trim()}
                variant="outline"
                onClick={() => void askAssistant("copilot")}
              >
                Creator Copilot
              </Button>
            </div>
            {assistantResult && (
              <div role="status" className="whitespace-pre-wrap rounded-2xl border border-border p-4">
                {assistantResult}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section id="clipping" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-intelligence" />
          <div>
            <h2 className="font-display text-3xl">Clipping workflow</h2>
            <p className="text-sm text-muted-foreground">
              Real worker stages only: analyze → transcribe → select clips → render.
            </p>
          </div>
        </div>
        {creatorJobs.length === 0 ? (
          <EmptyState text="No clipping jobs yet. Import or upload a source to start the canonical worker." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {creatorJobs.slice(0, 8).map((job) => {
              const active = creatorJobActive(job.status);
              const jobId = String(job.id);
              return (
                <Card key={jobId}>
                  <CardContent className="space-y-3 pt-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <strong className="text-sm">Job {jobId.slice(0, 8)}</strong>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Stage: {String(job.progress_stage ?? job.status ?? "unknown").replaceAll("_", " ")}
                        </p>
                      </div>
                      <StatusPill value={String(job.status ?? "unknown")} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Attempts: {String(job.attempt_count ?? 0)}</span>
                      <span>
                        {job.error_code ? `Error: ${String(job.error_code)}` : "No worker error"}
                      </span>
                    </div>
                    {active && (
                      <Button
                        variant={cancelConfirmJobId === jobId ? "destructive" : "outline"}
                        className="w-full"
                        onClick={() => void handleCancelJob(jobId)}
                      >
                        {cancelConfirmJobId === jobId ? "Confirm cancel" : "Cancel processing"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-display text-3xl">Real clip library</h2>
        </div>
        {(resources.creator_clips ?? []).length === 0 ? (
          <EmptyState text="Rendered clips will appear here only after the canonical worker creates real outputs." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(resources.creator_clips ?? []).map((clip) => {
              const draft = draftForClip(clip);
              const available = String(clip.render_status) === "available";
              return (
                <Card key={String(clip.id)}>
                  <CardContent className="space-y-3 pt-6">
                    <div className="flex items-center justify-between gap-2">
                      <strong>Clip #{String(clip.rank ?? "—")}</strong>
                      <StatusPill value={String(clip.render_status)} />
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {typeof clip.score === "number" && <span>Score: {String(clip.score)}</span>}
                      {clip.duration_ms != null && <span>{(Number(clip.duration_ms) / 1000).toFixed(1)}s</span>}
                      {Boolean(clip.aspect_ratio) && <span>{String(clip.aspect_ratio)}</span>}
                      {Boolean(clip.render_version) && <span>Render v{String(clip.render_version)}</span>}
                    </div>
                    {Boolean(clip.score_reason) && (
                      <p className="text-sm leading-5 text-muted-foreground">{String(clip.score_reason)}</p>
                    )}
                    {Boolean(clip.transcript_excerpt) && (
                      <p className="line-clamp-3 rounded-xl border border-border bg-background/40 p-3 text-xs leading-5 text-muted-foreground">
                        {String(clip.transcript_excerpt)}
                      </p>
                    )}
                    {Boolean(clip.output_path) && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          void signedCreatorOutput(String(clip.output_path))
                            .then((url) => window.open(url, "_blank", "noopener,noreferrer"))
                            .catch(() => toast.error("Authorized clip URL could not be created."))
                        }
                      >
                        <ExternalLink className="h-4 w-4" /> Authorized download
                      </Button>
                    )}
                    {available && (
                      <details className="rounded-xl border border-border p-3">
                        <summary className="cursor-pointer text-sm font-medium">Rerender this clip</summary>
                        <div className="mt-3 grid gap-3">
                          <div className="grid grid-cols-2 gap-2">
                            <Field
                              label="Start (seconds)"
                              type="number"
                              value={draft.startSeconds}
                              onChange={(value) => updateClipDraft(clip, { startSeconds: value })}
                            />
                            <Field
                              label="End (seconds)"
                              type="number"
                              value={draft.endSeconds}
                              onChange={(value) => updateClipDraft(clip, { endSeconds: value })}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Aspect ratio</Label>
                            <select
                              className="h-10 w-full rounded-md border bg-background px-3"
                              value={draft.aspectRatio}
                              onChange={(event) =>
                                updateClipDraft(clip, {
                                  aspectRatio: event.target.value as ClipRerenderDraft["aspectRatio"],
                                })
                              }
                            >
                              <option value="9:16">9:16</option>
                              <option value="1:1">1:1</option>
                              <option value="16:9">16:9</option>
                            </select>
                          </div>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={draft.captionsEnabled}
                              onChange={(event) =>
                                updateClipDraft(clip, { captionsEnabled: event.target.checked })
                              }
                            />
                            Render captions
                          </label>
                          <Button onClick={() => void handleRerenderClip(clip)}>
                            <RefreshCw className="h-4 w-4" /> Queue rerender
                          </Button>
                        </div>
                      </details>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <details id="setup" className="group rounded-3xl border border-border bg-surface/40 p-1" open={!profile.niche}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[1.3rem] px-4 py-4">
          <span className="flex items-center gap-3">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            <span>
              <strong className="block">Creator profile</strong>
              <span className="text-xs text-muted-foreground">
                {profile.niche ? `${profile.niche} · ${profile.displayName || "profile configured"}` : "Complete once, refine when needed"}
              </span>
            </span>
          </span>
          {profile.niche && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
        </summary>
        <div className="grid gap-4 border-t border-border p-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Experience level</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={profile.experience}
              onChange={(event) => updateProfile("experience", event.target.value)}
            >
              <option value="beginner">Beginner</option>
              <option value="creator">Creator</option>
              <option value="professional">Professional</option>
            </select>
          </div>
          <Field
            label="Platform targets (comma separated)"
            value={profile.platforms.join(", ")}
            onChange={(value) => updateProfile("platforms", split(value))}
          />
          <Field label="Niche" value={profile.niche} onChange={(value) => updateProfile("niche", value)} />
          <Field label="Goal" value={profile.goal} onChange={(value) => updateProfile("goal", value)} />
          <Field
            label="Primary audience region"
            value={profile.primaryAudienceRegion}
            onChange={(value) => updateProfile("primaryAudienceRegion", value)}
          />
          <Field
            label="Weekly posting capacity"
            type="number"
            value={String(profile.weeklyPostingCapacity)}
            onChange={(value) => updateProfile("weeklyPostingCapacity", Number(value))}
          />
          <Field
            label="Display name"
            value={profile.displayName}
            onChange={(value) => updateProfile("displayName", value)}
          />
          <Field
            label="Username ideas workspace"
            value={profile.usernameIdeas.join(", ")}
            onChange={(value) => updateProfile("usernameIdeas", split(value))}
          />
          <Field label="Bio" value={profile.bio} onChange={(value) => updateProfile("bio", value)} />
          <Field
            label="Positioning"
            value={profile.positioning}
            onChange={(value) => updateProfile("positioning", value)}
          />
          <Field label="Category" value={profile.category} onChange={(value) => updateProfile("category", value)} />
          <Field
            label="Call to action"
            value={profile.callToAction}
            onChange={(value) => updateProfile("callToAction", value)}
          />
          <Field
            label="Content pillars"
            value={profile.contentPillars.join(", ")}
            onChange={(value) => updateProfile("contentPillars", split(value))}
          />
          <Field
            label="Keywords"
            value={profile.keywords.join(", ")}
            onChange={(value) => updateProfile("keywords", split(value))}
          />
          <Field
            label="Brand tone"
            value={profile.brandTone}
            onChange={(value) => updateProfile("brandTone", value)}
          />
          <Field
            label="Visual direction"
            value={profile.visualDirection}
            onChange={(value) => updateProfile("visualDirection", value)}
          />
          <Button
            className="md:col-span-2"
            onClick={() => void mutate(() => saveCreatorProfile(userId, profile), "Creator profile saved")}
          >
            Save creator profile
          </Button>
        </div>
      </details>

      <details id="strategy" className="rounded-3xl border border-border bg-surface/40 p-1">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[1.3rem] px-4 py-4">
          <WandSparkles className="h-5 w-5 text-muted-foreground" />
          <span>
            <strong className="block">Strategy & goals</strong>
            <span className="text-xs text-muted-foreground">Plan without crowding the daily workspace</span>
          </span>
        </summary>
        <div className="grid gap-5 border-t border-border p-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Content strategy</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Platform</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3"
                  value={strategy.platform}
                  onChange={(event) => setStrategy({ ...strategy, platform: event.target.value })}
                >
                  {CREATOR_PLATFORMS.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
              </div>
              <Field label="Niche" value={strategy.niche} onChange={(value) => setStrategy({ ...strategy, niche: value })} />
              <Field label="Goal" value={strategy.goal} onChange={(value) => setStrategy({ ...strategy, goal: value })} />
              <Field
                label="Publishing frequency"
                type="number"
                value={String(strategy.publishingFrequency)}
                onChange={(value) => setStrategy({ ...strategy, publishingFrequency: Number(value) })}
              />
              <Field
                label="Target markets"
                value={strategy.targetMarkets.join(", ")}
                onChange={(value) => setStrategy({ ...strategy, targetMarkets: split(value) })}
              />
              <Field
                label="Formats"
                value={strategy.preferredContentFormats.join(", ")}
                onChange={(value) => setStrategy({ ...strategy, preferredContentFormats: split(value) })}
              />
              <Field
                label="Content pillars"
                value={strategy.contentPillars.join(", ")}
                onChange={(value) => setStrategy({ ...strategy, contentPillars: split(value) })}
              />
              <Button onClick={() => void mutate(() => saveCreatorStrategy(userId, strategy), "Strategy saved")}>
                Save strategy
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Creator goals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Goal title" value={goal} onChange={setGoal} />
              <Field label="Manual milestones" value={milestones} onChange={setMilestones} />
              <Button
                disabled={!goal.trim()}
                onClick={() => void mutate(() => saveCreatorGoal(userId, goal, split(milestones)), "Goal saved")}
              >
                Create goal
              </Button>
              {(resources.creator_goals ?? []).map((row) => (
                <div key={String(row.id)} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                  <span className="text-sm">{String(row.title)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void mutate(() => deleteCreatorGoal(userId, String(row.id)), "Goal deleted")}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </details>

      <details id="analytics" className="rounded-3xl border border-border bg-surface/40 p-1">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[1.3rem] px-4 py-4">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <span>
            <strong className="block">Content log & real analytics</strong>
            <span className="text-xs text-muted-foreground">Provider evidence and manual observations stay visibly separated</span>
          </span>
        </summary>
        <div className="space-y-5 border-t border-border p-4">
          <Card className="border-intelligence/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> Provider-verified analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-6 text-muted-foreground">
                KIVRYN stores only metrics actually returned by an authorized provider. Missing fields stay unknown;
                provider zeroes remain zero.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {(["youtube", "tiktok"] as const).map((provider) => {
                  const connected = providerConnections.find(
                    (row) => row.platform === provider && row.status === "connected",
                  );
                  const latestConnection = providerConnections.find((row) => row.platform === provider);
                  const label = provider === "youtube" ? "YouTube" : "TikTok";
                  return (
                    <div key={provider} className="rounded-2xl border border-border bg-background/35 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <strong>{label}</strong>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {connected
                              ? `Connected as ${String(connected.provider_display_name ?? connected.external_account_id ?? label)}`
                              : latestConnection
                                ? `Status: ${String(latestConnection.status).replaceAll("_", " ")}`
                                : "Not connected"}
                          </p>
                        </div>
                        <StatusPill value={connected ? "connected" : String(latestConnection?.status ?? "not_connected")} />
                      </div>
                      {connected ? (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Granted evidence:{" "}
                            {Array.isArray(connected.granted_metrics) && connected.granted_metrics.length
                              ? connected.granted_metrics.map(String).join(", ")
                              : "No metrics observed yet"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              disabled={providerBusy !== null}
                              onClick={() => void handleSyncProvider(String(connected.id))}
                            >
                              {providerBusy === String(connected.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              Sync analytics
                            </Button>
                            <Button
                              size="sm"
                              variant={disconnectConfirmId === String(connected.id) ? "destructive" : "outline"}
                              disabled={providerBusy !== null}
                              onClick={() => void handleDisconnectProvider(String(connected.id))}
                            >
                              <Unplug className="h-4 w-4" />
                              {disconnectConfirmId === String(connected.id) ? "Confirm disconnect" : "Disconnect"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          className="mt-4 w-full"
                          variant="outline"
                          disabled={providerBusy !== null}
                          onClick={() => void handleConnectProvider(provider)}
                        >
                          {providerBusy === provider && <Loader2 className="h-4 w-4 animate-spin" />}
                          Connect {label}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <div>
                  <strong className="text-sm">Verified content performance</strong>
                  <p className="text-xs text-muted-foreground">
                    Latest persisted provider snapshot per content item.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={providerBusy !== null || !providerConnections.some((row) => row.status === "connected")}
                  onClick={() => void handleSyncProvider()}
                >
                  {providerBusy === "all" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sync analytics
                </Button>
              </div>

              {providerAnalytics.length === 0 ? (
                <EmptyState text="No provider-verified analytics yet. Connect an approved provider and sync; KIVRYN will not draw sample charts." />
              ) : (
                <div className="space-y-3">
                  {providerAnalytics.slice(0, 20).map(({ content: item, snapshot, metrics: verified }) => {
                    const views = verified.views;
                    const width =
                      typeof views === "number" && maxProviderViews > 0
                        ? Math.max(2, Math.round((views / maxProviderViews) * 100))
                        : 0;
                    return (
                      <div
                        key={`${String(item.connection_id)}:${String(item.provider_content_id)}`}
                        className="rounded-2xl border border-border p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <strong className="block truncate text-sm">
                              {String(item.title ?? item.provider_content_id)}
                            </strong>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {String(item.platform)} · {new Date(String(item.published_at)).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                            provider verified
                          </span>
                        </div>
                        {typeof views === "number" && (
                          <div className="mt-3">
                            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                              <span>views</span>
                              <span>{views.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-border">
                              <div className="h-full rounded-full bg-intelligence/70" style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {Object.entries(verified)
                            .filter(([name]) => name !== "views")
                            .map(([name, value]) => (
                              <span key={name}>
                                {name.replaceAll("_", " ")}: {value.toLocaleString()}
                              </span>
                            ))}
                        </div>
                        {Boolean(snapshot && (snapshot.period_start || snapshot.period_end)) && (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Period: {String(snapshot?.period_start ?? "—")} → {String(snapshot?.period_end ?? "—")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card id="content">
            <CardHeader>
              <CardTitle>Manual content log</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <Field label="Internal title / label" value={content.title} onChange={(value) => setContent({ ...content, title: value })} />
              <Field label="Platform" value={content.platform} onChange={(value) => setContent({ ...content, platform: value })} />
              <Field label="Content type" value={content.contentType} onChange={(value) => setContent({ ...content, contentType: value })} />
              <Field label="Published at" value={content.publishedAt} onChange={(value) => setContent({ ...content, publishedAt: value })} />
              <Field label="Timezone" value={content.timezone} onChange={(value) => setContent({ ...content, timezone: value })} />
              <Field label="Optional URL / reference" value={content.referenceUrl ?? ""} onChange={(value) => setContent({ ...content, referenceUrl: value })} />
              <Field label="Optional content pillar" value={content.contentPillar ?? ""} onChange={(value) => setContent({ ...content, contentPillar: value })} />
              <Field
                label="Optional duration (ms)"
                type="number"
                value={String(content.durationMs ?? "")}
                onChange={(value) => setContent({ ...content, durationMs: value ? Number(value) : undefined })}
              />
              <div className="space-y-1.5 md:col-span-2">
                <Label>Notes</Label>
                <Textarea value={content.notes ?? ""} onChange={(event) => setContent({ ...content, notes: event.target.value })} />
              </div>
              <Button
                disabled={!content.title.trim()}
                onClick={() =>
                  void mutate(
                    () => saveCreatorContent(userId, { ...content, publishedAt: new Date(content.publishedAt).toISOString() }),
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
              <div key={String(row.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div>
                  <strong className="text-sm">{String(row.title)}</strong>
                  <p className="text-xs text-muted-foreground">{String(row.platform)} · {String(row.content_type)}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setContent({
                        id: String(row.id),
                        platform: String(row.platform),
                        contentType: String(row.content_type),
                        title: String(row.title),
                        publishedAt: String(row.published_at).slice(0, 16),
                        timezone: String(row.timezone),
                        referenceUrl: typeof row.reference_url === "string" ? row.reference_url : undefined,
                        contentPillar: typeof row.content_pillar === "string" ? row.content_pillar : undefined,
                        durationMs: typeof row.duration_ms === "number" ? row.duration_ms : undefined,
                        notes: typeof row.notes === "string" ? row.notes : undefined,
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void mutate(() => deleteCreatorContent(userId, String(row.id)), "Content entry deleted")}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Manual analytics</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {CREATOR_METRICS.map((metric) => (
                  <Field
                    key={metric}
                    label={metric.replaceAll("_", " ")}
                    value={metrics[metric] ?? ""}
                    onChange={(value) => setMetrics({ ...metrics, [metric]: value })}
                  />
                ))}
                <Button
                  className="sm:col-span-2"
                  disabled={!resources.creator_content_log?.[0]}
                  onClick={() =>
                    void mutate(
                      () => appendCreatorMetricSnapshot(userId, resources.creator_content_log[0], metrics),
                      "New observation appended",
                    )
                  }
                >
                  Append snapshot
                </Button>
                <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">
                  Blank values remain unknown. Zero is stored only when you explicitly enter zero.
                </p>
              </CardContent>
            </Card>

            <Card id="intelligence">
              <CardHeader>
                <CardTitle>Country intelligence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(country).map(([key, value]) => (
                  <Field
                    key={key}
                    label={key.replace(/([A-Z])/g, " $1")}
                    value={value}
                    onChange={(next) => setCountry({ ...country, [key]: next })}
                  />
                ))}
                <Button onClick={() => void mutate(() => saveCreatorCountry(userId, country), "Manual country observation saved")}>
                  Save observation
                </Button>
                <div className="space-y-2 pt-2">
                  {(resources.creator_manual_country_observations ?? []).map((row) => (
                    <p key={String(row.id)} className="rounded-xl border border-border p-3 text-sm">
                      {String(row.country_name)} · {String(row.value)}
                      <span className="text-muted-foreground"> — manually entered</span>
                    </p>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Provider snapshots above are provider-owned evidence. Country observations here remain explicitly manual until a provider returns that dimension.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </details>

      <details className="rounded-3xl border border-border bg-surface/40 p-1">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[1.3rem] px-4 py-4">
          <GraduationCap className="h-5 w-5 text-muted-foreground" />
          <span>
            <strong className="block">Creator Academy</strong>
            <span className="text-xs text-muted-foreground">Learning stays available without occupying the main creation flow</span>
          </span>
        </summary>
        <div className="grid gap-4 border-t border-border p-4 md:grid-cols-3">
          {Object.entries(CREATOR_ACADEMY).map(([level, lessons]) => (
            <Card key={level}>
              <CardHeader>
                <CardTitle>{level}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lessons.map((lesson) => {
                  const key = `${level.toLowerCase()}:${lesson.toLowerCase().replaceAll(" ", "_")}`;
                  const done = (resources.creator_learning_progress ?? []).some((row) => row.lesson_key === key);
                  return (
                    <label key={lesson} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={(event) =>
                          void mutate(
                            () => setLessonCompletion(userId, key, event.target.checked),
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
      </details>
    </main>
  );
}

function StatusCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/55 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const complete = ["completed", "available", "ready"].includes(value);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
        complete
          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
          : "border-border bg-background text-muted-foreground"
      }`}
    >
      {complete && <CheckCircle2 className="h-3 w-3" />}
      {value.replaceAll("_", " ")}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
