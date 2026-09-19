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
import {
  CreatorProviderConnectionError,
  CreatorYouTubeMetadataError,
  type CreatorProvider,
  type CreatorYouTubeMetadata,
  type CreatorYouTubeMetadataErrorCode,
} from "@/services/creator-service";

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

const youtubeMetadataErrorCopy: Record<
  "pt-BR" | "en",
  Record<CreatorYouTubeMetadataErrorCode, string>
> = {
  "pt-BR": {
    configuration_error:
      "A integração de metadados do YouTube não está configurada no servidor.",
    origin_not_allowed:
      "Este domínio não está autorizado a usar a integração do YouTube.",
    unauthorized: "Sua sessão expirou. Entre novamente e tente de novo.",
    invalid_youtube_url: "Use um link válido do YouTube.",
    quota_check_failed:
      "Não foi possível verificar seu limite de análise do YouTube. Tente novamente.",
    daily_limit_reached:
      "Você atingiu o limite diário de análises do YouTube.",
    youtube_provider_configuration:
      "A configuração da YouTube Data API precisa ser revisada.",
    youtube_provider_quota:
      "A cota da YouTube Data API foi atingida. Tente novamente mais tarde.",
    youtube_video_not_found:
      "Este vídeo não foi encontrado ou não está disponível publicamente.",
    youtube_metadata_unavailable:
      "O YouTube não retornou os metadados agora. Tente novamente.",
  },
  en: {
    configuration_error:
      "YouTube metadata integration is not configured on the server.",
    origin_not_allowed:
      "This domain is not authorized to use the YouTube integration.",
    unauthorized: "Your session expired. Sign in again and retry.",
    invalid_youtube_url: "Use a valid YouTube link.",
    quota_check_failed:
      "KIVRYN could not verify your YouTube analysis limit. Please retry.",
    daily_limit_reached:
      "You reached today's YouTube analysis limit.",
    youtube_provider_configuration:
      "The YouTube Data API configuration needs to be reviewed.",
    youtube_provider_quota:
      "The YouTube Data API quota was reached. Please retry later.",
    youtube_video_not_found:
      "This video was not found or is not publicly available.",
    youtube_metadata_unavailable:
      "YouTube did not return metadata right now. Please retry.",
  },
};

function creatorYouTubeMetadataErrorMessage(
  error: unknown,
  locale: "pt-BR" | "en",
) {
  const code =
    error instanceof CreatorYouTubeMetadataError
      ? error.code
      : "youtube_metadata_unavailable";
  return youtubeMetadataErrorCopy[locale][code];
}

function creatorProviderConnectionErrorMessage(
  error: unknown,
  locale: "pt-BR" | "en",
) {
  const rawCode =
    error instanceof CreatorProviderConnectionError
      ? error.code
      : typeof error === "string"
        ? error
        : "provider_request_failed";
  const pt: Record<string, string> = {
    configuration_error: "A configuração do OAuth do Creator está incompleta no servidor.",
    origin_not_allowed: "Este domínio não está autorizado a iniciar a conexão.",
    redirect_not_allowed: "O retorno OAuth do KIVRYN não está autorizado.",
    provider_not_configured: "O cliente OAuth do YouTube não está configurado no servidor.",
    oauth_state_failed: "Não foi possível iniciar uma sessão OAuth segura. Tente novamente.",
    provider_pending_approval: "Este provedor ainda exige aprovação externa.",
    unauthorized: "Sua sessão expirou. Entre novamente e tente de novo.",
    permission_denied: "A permissão do YouTube não foi concedida.",
    oauth_provider_error: "O Google não concluiu a autorização.",
    invalid_oauth_callback: "O retorno do OAuth foi inválido. Tente conectar novamente.",
    token_exchange_failed: "O Google não concluiu a troca segura de credenciais.",
    identity_failed: "A conta Google não retornou um canal do YouTube disponível.",
    connection_persistence_failed: "A conexão foi autorizada, mas não pôde ser salva.",
    credential_persistence_failed: "As credenciais foram recebidas, mas não puderam ser armazenadas.",
    credential_expired: "A autorização do provedor expirou. Reconecte a conta.",
    rate_limited: "O provedor limitou temporariamente as solicitações. Tente novamente depois.",
    provider_unavailable: "O provedor está temporariamente indisponível.",
    provider_request_failed: "O provedor rejeitou a solicitação de conexão.",
  };
  const en: Record<string, string> = {
    configuration_error: "Creator OAuth configuration is incomplete on the server.",
    origin_not_allowed: "This domain is not authorized to start the connection.",
    redirect_not_allowed: "The KIVRYN OAuth return URL is not authorized.",
    provider_not_configured: "The YouTube OAuth client is not configured on the server.",
    oauth_state_failed: "KIVRYN could not start a secure OAuth session. Please retry.",
    provider_pending_approval: "This provider still requires external approval.",
    unauthorized: "Your session expired. Sign in again and retry.",
    permission_denied: "YouTube permission was not granted.",
    oauth_provider_error: "Google did not complete authorization.",
    invalid_oauth_callback: "The OAuth callback was invalid. Please connect again.",
    token_exchange_failed: "Google did not complete the secure credential exchange.",
    identity_failed: "The Google account did not return an available YouTube channel.",
    connection_persistence_failed: "Authorization completed, but the connection could not be saved.",
    credential_persistence_failed: "Credentials were received but could not be stored.",
    credential_expired: "Provider authorization expired. Reconnect the account.",
    rate_limited: "The provider temporarily rate-limited requests. Retry later.",
    provider_unavailable: "The provider is temporarily unavailable.",
    provider_request_failed: "The provider rejected the connection request.",
  };
  return (locale === "pt-BR" ? pt : en)[rawCode] ??
    (locale === "pt-BR"
      ? "Não foi possível concluir a conexão do provedor."
      : "The provider connection could not be completed.");
}

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

const creatorStatusPt: Record<string, string> = {
  draft: "rascunho",
  ready: "pronto",
  uploading: "enviando",
  available: "disponível",
  failed: "falhou",
  queued: "na fila",
  analyzing: "analisando",
  transcribing: "transcrevendo",
  selecting_clips: "selecionando cortes",
  rendering: "renderizando",
  completed: "concluído",
  cancelled: "cancelado",
  cancel_requested: "cancelamento solicitado",
  retry_wait: "aguardando nova tentativa",
  connected: "conectado",
  needs_permission: "precisa de permissão",
  not_connected: "não conectado",
  disconnected: "desconectado",
  error: "erro",
  revoked: "revogado",
  expired: "expirado",
  unknown: "desconhecido",
  authorized_direct: "fonte direta autorizada",
  local_video: "vídeo local",
};

function creatorStatusLabel(value: unknown, locale: "pt-BR" | "en") {
  const normalized = String(value ?? "unknown");
  if (locale === "pt-BR") return creatorStatusPt[normalized] ?? normalized.replaceAll("_", " ");
  return normalized.replaceAll("_", " ");
}

function creatorConnectionState(row: Record<string, unknown> | undefined) {
  if (!row) return "not_connected";
  if (row.safe_error_code === "insufficient_scope") return "needs_permission";
  if (row.status === "revoked") return "disconnected";
  return String(row.status ?? "not_connected");
}

function creatorConnectionIssueCopy(
  row: Record<string, unknown> | undefined,
  locale: "pt-BR" | "en",
) {
  const code = String(row?.safe_error_code ?? "");
  if (!code) return null;
  const pt: Record<string, string> = {
    insufficient_scope: "A conexão existe, mas faltam permissões necessárias. Atualize as permissões.",
    credential_expired: "A autorização expirou. Reconecte o canal.",
    provider_unavailable: "O YouTube está temporariamente indisponível.",
    rate_limited: "O YouTube limitou temporariamente as solicitações.",
    youtube_channel_unavailable: "A conta conectada não retornou um canal do YouTube disponível.",
  };
  const en: Record<string, string> = {
    insufficient_scope: "The connection exists, but required permissions are missing. Update permissions.",
    credential_expired: "Authorization expired. Reconnect the channel.",
    provider_unavailable: "YouTube is temporarily unavailable.",
    rate_limited: "YouTube temporarily rate-limited requests.",
    youtube_channel_unavailable: "The connected account did not return an available YouTube channel.",
  };
  return (locale === "pt-BR" ? pt : en)[code] ??
    (locale === "pt-BR" ? "A conexão precisa de atenção." : "The connection needs attention.");
}

const creatorMetricPt: Record<string, string> = {
  views: "visualizações",
  reach: "alcance",
  watch_time_ms: "tempo de exibição",
  average_view_duration_ms: "duração média de visualização",
  retention_ratio: "retenção",
  likes: "curtidas",
  comments: "comentários",
  shares: "compartilhamentos",
  saves: "salvamentos",
  followers_gained: "seguidores conquistados",
};

function creatorMetricLabel(value: string, locale: "pt-BR" | "en") {
  return locale === "pt-BR" ? creatorMetricPt[value] ?? value.replaceAll("_", " ") : value.replaceAll("_", " ");
}

const creatorAcademyPt: Record<string, string> = {
  START: "INÍCIO",
  GROWTH: "CRESCIMENTO",
  PRO: "PRO",
  "Choose your niche": "Escolha seu nicho",
  "Build your profile": "Construa seu perfil",
  "Content pillar basics": "Fundamentos de pilares de conteúdo",
  Retention: "Retenção",
  Storytelling: "Narrativa",
  "Calls to action": "Chamadas para ação",
  "Content systems": "Sistemas de conteúdo",
  Experiments: "Experimentos",
  "Audience analysis": "Análise de público",
};

function creatorAcademyLabel(value: string, locale: "pt-BR" | "en") {
  return locale === "pt-BR" ? creatorAcademyPt[value] ?? value : value;
}

const creatorCountryFieldPt: Record<string, string> = {
  platform: "Plataforma",
  countryIso: "Código do país",
  countryName: "País",
  metricContext: "Contexto da métrica",
  value: "Valor",
  period: "Período",
  notes: "Observações",
};

function creatorCountryFieldLabel(value: string, locale: "pt-BR" | "en") {
  if (locale === "pt-BR") return creatorCountryFieldPt[value] ?? value;
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function creatorJobActive(status: unknown) {
  return ["queued", "analyzing", "transcribing", "selecting_clips", "rendering"].includes(
    String(status),
  );
}

function CreatorStudio() {
  const { user } = useAuth();
  const { t, resolvedLocale } = useLanguage();
  const L = (pt: string, en: string) => (resolvedLocale === "pt-BR" ? pt : en);
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
      toast.error(L("Os dados do Creator estão temporariamente indisponíveis. Tente novamente.", "Creator data is temporarily unavailable. Retry when ready."));
    });
  }, [reload]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const current = new URL(window.location.href);
    const connectionStatus = current.searchParams.get("creator_connection");
    const connectionError = current.searchParams.get("error");
    const provider = current.searchParams.get("provider");
    if (!connectionStatus && !connectionError) return;

    current.searchParams.delete("creator_connection");
    current.searchParams.delete("error");
    current.searchParams.delete("provider");
    window.history.replaceState({}, "", `${current.pathname}${current.search}${current.hash}`);

    void (async () => {
      if (connectionStatus === "connected") {
        toast.success(
          provider === "youtube"
            ? L("Canal do YouTube conectado. Validando dados do canal…", "YouTube channel connected. Validating channel data…")
            : L("Provedor do Creator conectado.", "Creator provider connected."),
        );
        if (provider === "youtube") {
          setProviderBusy("youtube");
          try {
            const result = await syncCreatorProviderAnalytics();
            toast.success(
              L(
                `YouTube sincronizado: ${result.content ?? 0} vídeos e ${result.snapshots ?? 0} snapshots novos.`,
                `YouTube synced: ${result.content ?? 0} videos and ${result.snapshots ?? 0} new snapshots.`,
              ),
            );
          } catch (error) {
            console.error("creator_youtube_first_sync_failed", error);
            toast.error(
              L(
                "O canal conectou, mas a primeira sincronização não terminou. Verifique permissões e tente Sincronizar analytics.",
                "The channel connected, but the first sync did not finish. Check permissions and retry Sync analytics.",
              ),
            );
          } finally {
            setProviderBusy(null);
          }
        }
      } else if (connectionError) {
        toast.error(creatorProviderConnectionErrorMessage(connectionError, resolvedLocale));
      }
      await reload();
    })();
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
      toast.error(L("Não foi possível salvar. Seus dados existentes não foram alterados.", "Could not save. Your existing data is unchanged."));
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
      toast.error(L("Cole primeiro uma URL de origem.", "Paste a source URL first."));
      return;
    }
    setSourceBusy(true);
    setYoutubeMetadata(null);
    try {
      if (isYouTubeUrl(sourceUrl)) {
        const metadata = await inspectCreatorYouTubeUrl(sourceUrl);
        setYoutubeMetadata(metadata);
        setSourceTitle((current) => current || metadata.title);
        toast.success(L("Fonte do YouTube reconhecida. Envie o vídeo original para criar cortes.", "YouTube source recognized. Upload the original video to create clips."));
        return;
      }
      if (!sourceAuthorized) {
        toast.error(L("Confirme que você possui ou tem autorização para processar este vídeo.", "Confirm that you own or are authorized to process this video."));
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
      toast.success(L("Fonte importada. A KIVRYN colocou o processamento real de cortes na fila.", "Source imported. KIVRYN queued the real clipping job."));
    } catch (error) {
      console.error("creator_source_url_failed", error);
      toast.error(
        isYouTubeUrl(sourceUrl)
          ? creatorYouTubeMetadataErrorMessage(error, resolvedLocale)
          : resolvedLocale === "pt-BR"
            ? "Esta URL não pôde ser importada. Use um link HTTPS direto para o vídeo ou envie o arquivo."
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
      toast.success(L("Vídeo enviado. A KIVRYN colocou o processamento real de cortes na fila.", "Video uploaded. KIVRYN queued the real clipping job."));
    } catch (error) {
      console.error("creator_local_upload_failed", error);
      toast.error(L("Não foi possível enviar o vídeo. Nenhum estado fictício de processamento foi criado.", "The video could not be uploaded. No fake processing state was created."));
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
      toast.success(L("Processamento do Creator cancelado.", "Creator processing cancelled."));
    } catch (error) {
      console.error("creator_job_cancel_failed", error);
      toast.error(L("Não foi possível cancelar este processamento do Creator.", "This Creator job could not be cancelled."));
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
      toast.success(L("Nova renderização colocada na fila do worker canônico do Creator.", "Rerender queued in the canonical Creator worker."));
    } catch (error) {
      console.error("creator_rerender_failed", error);
      toast.error(L("Não foi possível colocar a nova renderização na fila. Revise o intervalo do corte e tente novamente.", "Could not queue this rerender. Check the clip range and retry."));
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
          ? creatorProviderConnectionErrorMessage(error, resolvedLocale)
          : L(
              "A conexão com o TikTok exige um aplicativo de provedor aprovado.",
              "TikTok connection requires an approved provider app.",
            ),
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
        L(
          `Analytics do provedor sincronizados: ${result.content ?? 0} registros de conteúdo e ${result.snapshots ?? 0} novos snapshots.`,
          `Provider analytics synced: ${result.content ?? 0} content records, ${result.snapshots ?? 0} new snapshots.`,
        ),
      );
    } catch (error) {
      console.error("creator_analytics_sync_failed", error);
      toast.error(L("Não foi possível sincronizar os analytics do provedor.", "Provider analytics could not be synced."));
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
      toast.success(L("Provedor desconectado. O histórico de analytics existente foi preservado.", "Provider disconnected. Existing analytics history was retained."));
    } catch (error) {
      console.error("creator_provider_disconnect_failed", error);
      toast.error(L("Não foi possível desconectar o provedor.", "Provider could not be disconnected."));
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
          <h1 className="mt-2 font-display text-4xl md:text-5xl">{L("Crie a partir da fonte, sem ruído.", "Create from the source, not the clutter.")}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
            {L(
              "Comece pelo vídeo. A KIVRYN mantém a fonte privada, envia pelo pipeline canônico de cortes e mostra apenas projetos, processamentos e resultados reais.",
              "Bring the video first. KIVRYN keeps the source private, sends it through the canonical clipping pipeline and shows only real projects, jobs and outputs.",
            )}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatusCard label={L("Fontes", "Sources")} value={projectCount} detail={L("projetos reais do Creator", "real creator projects")} />
          <StatusCard label={L("Processando", "Processing")} value={activeJobs} detail={L("processamentos ativos no backend", "active backend jobs")} />
          <StatusCard label={L("Cortes", "Clips")} value={clipCount} detail={L("resultados renderizados", "rendered outputs")} />
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          {L(
            "O Creator funciona sem credenciais sociais. Integrações de publicação só ficam conectadas quando existe uma conexão de provedor verificada.",
            "Standalone Creator works without social credentials. Social publishing integrations are not connected unless a verified provider connection is configured.",
          )}
        </p>
      </header>

      <section id="media" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-intelligence" />
          <h2 className="font-display text-3xl">{L("Espaço de fontes", "Source workspace")}</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <Card className="overflow-hidden border-intelligence/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" /> {L("Cole uma fonte de vídeo", "Paste a video source")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="creator-source-url">{L("URL do vídeo", "Video URL")}</Label>
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
              <Field label={L("Título do projeto (opcional)", "Optional project title")} value={sourceTitle} onChange={setSourceTitle} />
              {!isYouTubeUrl(sourceUrl) && (
                <label className="flex items-start gap-3 rounded-xl border border-border bg-surface/60 p-3 text-sm">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={sourceAuthorized}
                    onChange={(event) => setSourceAuthorized(event.target.checked)}
                  />
                  <span>
                    {L(
                      "Eu possuo este vídeo ou tenho permissão para processá-lo. A KIVRYN importa apenas uma fonte HTTPS direta para meu armazenamento privado do Creator.",
                      "I own this video or have permission to process it. KIVRYN imports only a direct HTTPS video source into my private Creator storage.",
                    )}
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
                {isYouTubeUrl(sourceUrl) ? L("Analisar link do YouTube", "Analyze YouTube link") : L("Importar e criar cortes", "Import & create clips")}
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                {L(
                  "Arquivos de vídeo HTTPS diretos podem entrar no pipeline real de cortes. Links do YouTube são inspecionados pela integração oficial de metadados; o download do vídeo da plataforma não é oferecido, portanto o arquivo original é necessário.",
                  "Direct HTTPS video files can enter the real clipping pipeline. YouTube links are inspected with the official metadata integration; downloading the platform video is not presented as available, so the original file is required.",
                )}
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
                      {L("Envio do arquivo original necessário antes dos cortes.", "Original upload required before clipping.")}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" /> {L("Enviar original", "Upload original")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                {L(
                  "Ideal para exportações do YouTube/TikTok, arquivos originais grandes ou qualquer fonte que não seja uma URL direta de vídeo.",
                  "Best for YouTube/TikTok exports, large originals or any source that is not a direct video URL.",
                )}
              </p>
              <Label
                htmlFor="creator-video"
                className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 px-5 text-center transition hover:border-foreground/30"
              >
                <Upload className="mb-3 h-7 w-7 text-muted-foreground" />
                <span className="font-medium">{L("Escolher arquivo de vídeo", "Choose a video file")}</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {L("O navegador envia o arquivo para seu bucket privado de fontes do Creator.", "The browser uploads it to your private Creator source bucket.")}
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
            <CardTitle>{L("Pipeline do Creator", "Creator pipeline")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(resources.creator_projects ?? []).length === 0 && (
              <EmptyState text={L("Ainda não há projeto de origem. Cole uma URL direta de vídeo ou envie um original acima.", "No source project yet. Paste a direct video URL or upload an original above.")} />
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
                        {creatorStatusLabel(project.source_type, resolvedLocale)} · {creatorStatusLabel(project.status, resolvedLocale)}
                        {formatBytes(project.source_size_bytes)
                          ? ` · ${formatBytes(project.source_size_bytes)}`
                          : ""}
                      </p>
                    </div>
                    <StatusPill value={String(latestJob?.progress_stage ?? project.status)} locale={resolvedLocale} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WandSparkles className="h-5 w-5" /> {L("Próxima melhor ação", "Next best action")}
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
                {L("Continuar", "Continue")}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void mutate(
                    () => createCreatorTask(action.label),
                    L("Adicionado às Tarefas canônicas", "Added to canonical Tasks"),
                  )
                }
              >
                {L("Adicionar às Tarefas", "Add to Tasks")}
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
            <Label htmlFor="creator-ai">{L("Tema, público, objetivo e tom", "Topic, audience, goal and tone")}</Label>
            <Textarea
              id="creator-ai"
              value={assistantInput}
              onChange={(event) => setAssistantInput(event.target.value)}
              placeholder={L("Descreva o que você quer criar…", "Describe what you want to create…")}
            />
            <div className="flex flex-wrap gap-2">
              <Button disabled={!assistantInput.trim()} onClick={() => void askAssistant("ideas")}>
                {L("Ideias de conteúdo", "Content Ideas")}
              </Button>
              <Button
                disabled={!assistantInput.trim()}
                variant="outline"
                onClick={() => void askAssistant("hooks")}
              >
                {L("Laboratório de hooks", "Hook Lab")}
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
            <h2 className="font-display text-3xl">{L("Fluxo de cortes", "Clipping workflow")}</h2>
            <p className="text-sm text-muted-foreground">
              {L("Apenas etapas reais do worker: analisar → transcrever → selecionar cortes → renderizar.", "Real worker stages only: analyze → transcribe → select clips → render.")}
            </p>
          </div>
        </div>
        {creatorJobs.length === 0 ? (
          <EmptyState text={L("Ainda não há processamentos de cortes. Importe ou envie uma fonte para iniciar o worker canônico.", "No clipping jobs yet. Import or upload a source to start the canonical worker.")} />
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
                        <strong className="text-sm">{L("Processamento", "Job")} {jobId.slice(0, 8)}</strong>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {L("Etapa", "Stage")}: {creatorStatusLabel(job.progress_stage ?? job.status ?? "unknown", resolvedLocale)}
                        </p>
                      </div>
                      <StatusPill value={String(job.status ?? "unknown")} locale={resolvedLocale} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>{L("Tentativas", "Attempts")}: {String(job.attempt_count ?? 0)}</span>
                      <span>
                        {job.error_code ? `${L("Erro", "Error")}: ${String(job.error_code)}` : L("Sem erro do worker", "No worker error")}
                      </span>
                    </div>
                    {active && (
                      <Button
                        variant={cancelConfirmJobId === jobId ? "destructive" : "outline"}
                        className="w-full"
                        onClick={() => void handleCancelJob(jobId)}
                      >
                        {cancelConfirmJobId === jobId ? L("Confirmar cancelamento", "Confirm cancel") : L("Cancelar processamento", "Cancel processing")}
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
          <h2 className="font-display text-3xl">{L("Biblioteca real de cortes", "Real clip library")}</h2>
        </div>
        {(resources.creator_clips ?? []).length === 0 ? (
          <EmptyState text={L("Os cortes renderizados aparecerão aqui somente depois que o worker canônico criar resultados reais.", "Rendered clips will appear here only after the canonical worker creates real outputs.")} />
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
                      <StatusPill value={String(clip.render_status)} locale={resolvedLocale} />
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {typeof clip.score === "number" && <span>{L("Pontuação", "Score")}: {String(clip.score)}</span>}
                      {clip.duration_ms != null && <span>{(Number(clip.duration_ms) / 1000).toFixed(1)}s</span>}
                      {Boolean(clip.aspect_ratio) && <span>{String(clip.aspect_ratio)}</span>}
                      {Boolean(clip.render_version) && <span>{L("Renderização", "Render")} v{String(clip.render_version)}</span>}
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
                            .catch(() => toast.error(L("Não foi possível criar a URL autorizada do corte.", "Authorized clip URL could not be created.")))
                        }
                      >
                        <ExternalLink className="h-4 w-4" /> {L("Download autorizado", "Authorized download")}
                      </Button>
                    )}
                    {available && (
                      <details className="rounded-xl border border-border p-3">
                        <summary className="cursor-pointer text-sm font-medium">{L("Renderizar este corte novamente", "Rerender this clip")}</summary>
                        <div className="mt-3 grid gap-3">
                          <div className="grid grid-cols-2 gap-2">
                            <Field
                              label={L("Início (segundos)", "Start (seconds)")}
                              type="number"
                              value={draft.startSeconds}
                              onChange={(value) => updateClipDraft(clip, { startSeconds: value })}
                            />
                            <Field
                              label={L("Fim (segundos)", "End (seconds)")}
                              type="number"
                              value={draft.endSeconds}
                              onChange={(value) => updateClipDraft(clip, { endSeconds: value })}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>{L("Proporção", "Aspect ratio")}</Label>
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
                            {L("Renderizar legendas", "Render captions")}
                          </label>
                          <Button onClick={() => void handleRerenderClip(clip)}>
                            <RefreshCw className="h-4 w-4" /> {L("Colocar nova renderização na fila", "Queue rerender")}
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
              <strong className="block">{L("Perfil do Creator", "Creator profile")}</strong>
              <span className="text-xs text-muted-foreground">
                {profile.niche
                  ? `${profile.niche} · ${profile.displayName || L("perfil configurado", "profile configured")}`
                  : L("Configure uma vez e refine quando precisar", "Complete once, refine when needed")}
              </span>
            </span>
          </span>
          {profile.niche && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
        </summary>
        <div className="grid gap-4 border-t border-border p-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{L("Nível de experiência", "Experience level")}</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={profile.experience}
              onChange={(event) => updateProfile("experience", event.target.value)}
            >
              <option value="beginner">{L("Iniciante", "Beginner")}</option>
              <option value="creator">{L("Criador", "Creator")}</option>
              <option value="professional">{L("Profissional", "Professional")}</option>
            </select>
          </div>
          <Field
            label={L("Plataformas-alvo (separadas por vírgula)", "Platform targets (comma separated)")}
            value={profile.platforms.join(", ")}
            onChange={(value) => updateProfile("platforms", split(value))}
          />
          <Field label={L("Nicho", "Niche")} value={profile.niche} onChange={(value) => updateProfile("niche", value)} />
          <Field label={L("Objetivo", "Goal")} value={profile.goal} onChange={(value) => updateProfile("goal", value)} />
          <Field
            label={L("Região principal do público", "Primary audience region")}
            value={profile.primaryAudienceRegion}
            onChange={(value) => updateProfile("primaryAudienceRegion", value)}
          />
          <Field
            label={L("Capacidade semanal de publicações", "Weekly posting capacity")}
            type="number"
            value={String(profile.weeklyPostingCapacity)}
            onChange={(value) => updateProfile("weeklyPostingCapacity", Number(value))}
          />
          <Field
            label={L("Nome de exibição", "Display name")}
            value={profile.displayName}
            onChange={(value) => updateProfile("displayName", value)}
          />
          <Field
            label={L("Espaço de ideias de nome de usuário", "Username ideas workspace")}
            value={profile.usernameIdeas.join(", ")}
            onChange={(value) => updateProfile("usernameIdeas", split(value))}
          />
          <Field label={L("Bio", "Bio")} value={profile.bio} onChange={(value) => updateProfile("bio", value)} />
          <Field
            label={L("Posicionamento", "Positioning")}
            value={profile.positioning}
            onChange={(value) => updateProfile("positioning", value)}
          />
          <Field label={L("Categoria", "Category")} value={profile.category} onChange={(value) => updateProfile("category", value)} />
          <Field
            label={L("Chamada para ação", "Call to action")}
            value={profile.callToAction}
            onChange={(value) => updateProfile("callToAction", value)}
          />
          <Field
            label={L("Pilares de conteúdo", "Content pillars")}
            value={profile.contentPillars.join(", ")}
            onChange={(value) => updateProfile("contentPillars", split(value))}
          />
          <Field
            label={L("Palavras-chave", "Keywords")}
            value={profile.keywords.join(", ")}
            onChange={(value) => updateProfile("keywords", split(value))}
          />
          <Field
            label={L("Tom da marca", "Brand tone")}
            value={profile.brandTone}
            onChange={(value) => updateProfile("brandTone", value)}
          />
          <Field
            label={L("Direção visual", "Visual direction")}
            value={profile.visualDirection}
            onChange={(value) => updateProfile("visualDirection", value)}
          />
          <Button
            className="md:col-span-2"
            onClick={() =>
              void mutate(
                () => saveCreatorProfile(userId, profile),
                L("Perfil do Creator salvo", "Creator profile saved"),
              )
            }
          >
            {L("Salvar perfil do Creator", "Save creator profile")}
          </Button>
        </div>
      </details>

      <details id="strategy" className="rounded-3xl border border-border bg-surface/40 p-1">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[1.3rem] px-4 py-4">
          <WandSparkles className="h-5 w-5 text-muted-foreground" />
          <span>
            <strong className="block">{L("Estratégia e metas", "Strategy & goals")}</strong>
            <span className="text-xs text-muted-foreground">{L("Planeje sem sobrecarregar o espaço de trabalho diário", "Plan without crowding the daily workspace")}</span>
          </span>
        </summary>
        <div className="grid gap-5 border-t border-border p-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{L("Estratégia de conteúdo", "Content strategy")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="space-y-1.5">
                <Label>{L("Plataforma", "Platform")}</Label>
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
              <Field label={L("Nicho", "Niche")} value={strategy.niche} onChange={(value) => setStrategy({ ...strategy, niche: value })} />
              <Field label={L("Objetivo", "Goal")} value={strategy.goal} onChange={(value) => setStrategy({ ...strategy, goal: value })} />
              <Field
                label={L("Frequência de publicação", "Publishing frequency")}
                type="number"
                value={String(strategy.publishingFrequency)}
                onChange={(value) => setStrategy({ ...strategy, publishingFrequency: Number(value) })}
              />
              <Field
                label={L("Mercados-alvo", "Target markets")}
                value={strategy.targetMarkets.join(", ")}
                onChange={(value) => setStrategy({ ...strategy, targetMarkets: split(value) })}
              />
              <Field
                label={L("Formatos", "Formats")}
                value={strategy.preferredContentFormats.join(", ")}
                onChange={(value) => setStrategy({ ...strategy, preferredContentFormats: split(value) })}
              />
              <Field
                label={L("Pilares de conteúdo", "Content pillars")}
                value={strategy.contentPillars.join(", ")}
                onChange={(value) => setStrategy({ ...strategy, contentPillars: split(value) })}
              />
              <Button
                onClick={() =>
                  void mutate(
                    () => saveCreatorStrategy(userId, strategy),
                    L("Estratégia salva", "Strategy saved"),
                  )
                }
              >
                {L("Salvar estratégia", "Save strategy")}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{L("Metas do Creator", "Creator goals")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label={L("Título da meta", "Goal title")} value={goal} onChange={setGoal} />
              <Field label={L("Marcos manuais", "Manual milestones")} value={milestones} onChange={setMilestones} />
              <Button
                disabled={!goal.trim()}
                onClick={() =>
                  void mutate(
                    () => saveCreatorGoal(userId, goal, split(milestones)),
                    L("Meta salva", "Goal saved"),
                  )
                }
              >
                {L("Criar meta", "Create goal")}
              </Button>
              {(resources.creator_goals ?? []).map((row) => (
                <div key={String(row.id)} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                  <span className="text-sm">{String(row.title)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void mutate(
                        () => deleteCreatorGoal(userId, String(row.id)),
                        L("Meta excluída", "Goal deleted"),
                      )
                    }
                  >
                    {L("Excluir", "Delete")}
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
            <strong className="block">{L("Registro de conteúdo e analytics reais", "Content log & real analytics")}</strong>
            <span className="text-xs text-muted-foreground">{L("Evidências do provedor e observações manuais permanecem claramente separadas", "Provider evidence and manual observations stay visibly separated")}</span>
          </span>
        </summary>
        <div className="space-y-5 border-t border-border p-4">
          <Card className="border-intelligence/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> {L("Analytics verificados pelo provedor", "Provider-verified analytics")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-6 text-muted-foreground">
                {L(
                  "A KIVRYN armazena apenas métricas realmente retornadas por um provedor autorizado. Campos ausentes permanecem desconhecidos; zeros do provedor continuam sendo zero.",
                  "KIVRYN stores only metrics actually returned by an authorized provider. Missing fields stay unknown; provider zeroes remain zero.",
                )}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {(["youtube", "tiktok"] as const).map((provider) => {
                  const latestConnection = providerConnections.find((row) => row.platform === provider);
                  const connectionState = creatorConnectionState(latestConnection);
                  const connected =
                    latestConnection && connectionState === "connected" ? latestConnection : undefined;
                  const issue = creatorConnectionIssueCopy(latestConnection, resolvedLocale);
                  const label = provider === "youtube" ? "YouTube" : "TikTok";
                  return (
                    <div key={provider} className="rounded-2xl border border-border bg-background/35 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          {typeof latestConnection?.provider_avatar_url === "string" &&
                          latestConnection.provider_avatar_url.startsWith("https://") ? (
                            <img
                              src={latestConnection.provider_avatar_url}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : null}
                          <div className="min-w-0">
                            <strong>{label}</strong>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {latestConnection?.provider_display_name
                                ? `${String(latestConnection.provider_display_name)} · ${creatorStatusLabel(connectionState, resolvedLocale)}`
                                : creatorStatusLabel(connectionState, resolvedLocale)}
                            </p>
                            {latestConnection?.last_success_at ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {L("Última sincronização", "Last sync")}:{" "}
                                {new Date(String(latestConnection.last_success_at)).toLocaleString()}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <StatusPill value={connectionState} locale={resolvedLocale} />
                      </div>
                      {issue ? (
                        <p className="mt-3 text-xs text-amber-600">{issue}</p>
                      ) : null}
                      {connected ? (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs text-muted-foreground">
                            {L("Evidências concedidas", "Granted evidence")}:{" "}
                            {Array.isArray(connected.granted_metrics) && connected.granted_metrics.length
                              ? connected.granted_metrics.map((metric) => creatorMetricLabel(String(metric), resolvedLocale)).join(", ")
                              : L("Nenhuma métrica observada ainda", "No metrics observed yet")}
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
                              {L("Sincronizar analytics", "Sync analytics")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={providerBusy !== null}
                              onClick={() => void handleConnectProvider(provider)}
                            >
                              {L("Atualizar permissões", "Update permissions")}
                            </Button>
                            <Button
                              size="sm"
                              variant={disconnectConfirmId === String(connected.id) ? "destructive" : "outline"}
                              disabled={providerBusy !== null}
                              onClick={() => void handleDisconnectProvider(String(connected.id))}
                            >
                              <Unplug className="h-4 w-4" />
                              {disconnectConfirmId === String(connected.id)
                                ? L("Confirmar desconexão", "Confirm disconnect")
                                : L("Desconectar", "Disconnect")}
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
                          {provider === "youtube"
                            ? latestConnection
                              ? L("Reconectar / atualizar YouTube", "Reconnect / update YouTube")
                              : L("Conectar YouTube", "Connect YouTube")
                            : L("Conectar TikTok", "Connect TikTok")}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <div>
                  <strong className="text-sm">{L("Desempenho de conteúdo verificado", "Verified content performance")}</strong>
                  <p className="text-xs text-muted-foreground">
                    {L("Snapshot persistido mais recente do provedor para cada conteúdo.", "Latest persisted provider snapshot per content item.")}
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
                  {L("Sincronizar analytics", "Sync analytics")}
                </Button>
              </div>

              {providerAnalytics.length === 0 ? (
                <EmptyState
                  text={L(
                    "Ainda não há analytics verificados pelo provedor. Conecte um provedor aprovado e sincronize; a KIVRYN não exibe dados até existir evidência verificada.",
                    "No provider-verified analytics yet. Connect an approved provider and sync; KIVRYN renders nothing until verified evidence exists.",
                  )}
                />
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
                            {L("verificado pelo provedor", "provider verified")}
                          </span>
                        </div>
                        {typeof views === "number" && (
                          <div className="mt-3">
                            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                              <span>{creatorMetricLabel("views", resolvedLocale)}</span>
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
                                {creatorMetricLabel(name, resolvedLocale)}: {value.toLocaleString()}
                              </span>
                            ))}
                        </div>
                        {Boolean(snapshot && (snapshot.period_start || snapshot.period_end)) && (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            {L("Período", "Period")}: {String(snapshot?.period_start ?? "—")} → {String(snapshot?.period_end ?? "—")}
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
              <CardTitle>{L("Registro manual de conteúdo", "Manual content log")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <Field label={L("Título interno / rótulo", "Internal title / label")} value={content.title} onChange={(value) => setContent({ ...content, title: value })} />
              <Field label={L("Plataforma", "Platform")} value={content.platform} onChange={(value) => setContent({ ...content, platform: value })} />
              <Field label={L("Tipo de conteúdo", "Content type")} value={content.contentType} onChange={(value) => setContent({ ...content, contentType: value })} />
              <Field label={L("Publicado em", "Published at")} value={content.publishedAt} onChange={(value) => setContent({ ...content, publishedAt: value })} />
              <Field label={L("Fuso horário", "Timezone")} value={content.timezone} onChange={(value) => setContent({ ...content, timezone: value })} />
              <Field label={L("URL / referência opcional", "Optional URL / reference")} value={content.referenceUrl ?? ""} onChange={(value) => setContent({ ...content, referenceUrl: value })} />
              <Field label={L("Pilar de conteúdo opcional", "Optional content pillar")} value={content.contentPillar ?? ""} onChange={(value) => setContent({ ...content, contentPillar: value })} />
              <Field
                label={L("Duração opcional (ms)", "Optional duration (ms)")}
                type="number"
                value={String(content.durationMs ?? "")}
                onChange={(value) => setContent({ ...content, durationMs: value ? Number(value) : undefined })}
              />
              <div className="space-y-1.5 md:col-span-2">
                <Label>{L("Observações", "Notes")}</Label>
                <Textarea value={content.notes ?? ""} onChange={(event) => setContent({ ...content, notes: event.target.value })} />
              </div>
              <Button
                disabled={!content.title.trim()}
                onClick={() =>
                  void mutate(
                    () => saveCreatorContent(userId, { ...content, publishedAt: new Date(content.publishedAt).toISOString() }),
                    L("Conteúdo salvo", "Content saved"),
                  )
                }
              >
                {L("Salvar conteúdo", "Save content")}
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
                    {L("Editar", "Edit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void mutate(
                        () => deleteCreatorContent(userId, String(row.id)),
                        L("Entrada de conteúdo excluída", "Content entry deleted"),
                      )
                    }
                  >
                    {L("Excluir", "Delete")}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{L("Analytics manuais", "Manual analytics")}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {L("Somente observações manuais nesta seção; evidências verificadas pelo provedor permanecem separadas acima.", "Manual observations only in this section; provider-verified evidence stays separate above.")}
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {CREATOR_METRICS.map((metric) => (
                  <Field
                    key={metric}
                    label={creatorMetricLabel(metric, resolvedLocale)}
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
                      L("Nova observação adicionada", "New observation appended"),
                    )
                  }
                >
                  {L("Adicionar snapshot", "Append snapshot")}
                </Button>
                <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">
                  {L("Valores em branco permanecem desconhecidos. Zero só é armazenado quando você informa zero explicitamente.", "Blank values remain unknown. Zero is stored only when you explicitly enter zero.")}
                </p>
              </CardContent>
            </Card>

            <Card id="intelligence">
              <CardHeader>
                <CardTitle>{L("Inteligência por país", "Country intelligence")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(country).map(([key, value]) => (
                  <Field
                    key={key}
                    label={creatorCountryFieldLabel(key, resolvedLocale)}
                    value={value}
                    onChange={(next) => setCountry({ ...country, [key]: next })}
                  />
                ))}
                <Button
                  onClick={() =>
                    void mutate(
                      () => saveCreatorCountry(userId, country),
                      L("Observação manual por país salva", "Manual country observation saved"),
                    )
                  }
                >
                  {L("Salvar observação", "Save observation")}
                </Button>
                <div className="space-y-2 pt-2">
                  {(resources.creator_manual_country_observations ?? []).map((row) => (
                    <p key={String(row.id)} className="rounded-xl border border-border p-3 text-sm">
                      {String(row.country_name)} · {String(row.value)}
                      <span className="text-muted-foreground"> — {L("inserido manualmente", "manually entered")}</span>
                    </p>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    {L("Os snapshots acima são evidências do provedor. As observações por país aqui permanecem explicitamente manuais até que um provedor retorne essa dimensão.", "Provider snapshots above are provider-owned evidence. Country observations here remain explicitly manual until a provider returns that dimension.")}
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
            <strong className="block">{L("Academia do Creator", "Creator Academy")}</strong>
            <span className="text-xs text-muted-foreground">{L("O aprendizado continua disponível sem ocupar o fluxo principal de criação", "Learning stays available without occupying the main creation flow")}</span>
          </span>
        </summary>
        <div className="grid gap-4 border-t border-border p-4 md:grid-cols-3">
          {Object.entries(CREATOR_ACADEMY).map(([level, lessons]) => (
            <Card key={level}>
              <CardHeader>
                <CardTitle>{creatorAcademyLabel(level, resolvedLocale)}</CardTitle>
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
                            L("Progresso da Academia salvo", "Academy progress saved"),
                          )
                        }
                      />
                      {creatorAcademyLabel(lesson, resolvedLocale)}
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

function StatusPill({ value, locale }: { value: string; locale: "pt-BR" | "en" }) {
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
      {creatorStatusLabel(value, locale)}
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
