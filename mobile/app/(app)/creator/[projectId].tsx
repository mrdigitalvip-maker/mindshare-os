import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppScreen } from "@/components/app-screen";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import {
  cancelCreatorJob,
  getCreatorProject,
  getLatestCreatorJob,
  getCreatorTranscript,
  listCreatorClipCandidates,
  listCreatorClips,
  requestClipRerender,
  type CreatorClip,
  type CreatorClipCandidate,
  type CreatorJob,
  type CreatorProject,
  type CreatorTranscript,
} from "@/services/creator-service";
import { requestCreatorExport, shareCreatorExport } from "@/services/creator-export-service";
import { colors, radius, shadows, spacing, typography } from "@/lib/theme";

const copy = {
  "pt-BR": {
    eyebrow: "CREATOR STUDIO",
    source: "PROJETO",
    pipeline: "PIPELINE",
    processing: "Processando seu vídeo",
    processingCopy: "A KIVRYN está transformando o arquivo em sinais, transcrição e cortes renderizados.",
    cancel: "Cancelar processamento",
    transcript: "TRANSCRIÇÃO",
    candidates: "CANDIDATOS",
    candidateNote: "Candidates são análise/timestamps. Só cortes renderizados têm arquivo real.",
    clips: "CORTES RENDERIZADOS",
    noClips: "Os vídeos renderizados aparecerão aqui quando o worker terminar.",
    potential: "Content Potential",
    signal: "Sinal interno — não é garantia de viralidade.",
    excerpt: "TRECHO",
    download: "Baixar vídeo",
    downloading: "Preparando download…",
    share: "Compartilhar",
    sharing: "Preparando compartilhamento…",
    rerender: "Renderizar novamente",
    rerendering: "Enfileirando render…",
    package: "Criar descrição e pacote de postagem",
    projectAI: "Analisar projeto com KIVRYN",
    aiCopy: "Compare os cortes reais deste projeto e decida qual merece ser trabalhado primeiro.",
    outputReady: "Export renderizado",
    outputWaiting: "Renderização pendente",
    invalid: "Projeto não encontrado",
    settings: "CONFIGURAÇÃO",
    captions: "Legendas",
    on: "ON",
    off: "OFF",
    refreshes: "Atualização automática a cada 5 segundos durante o processamento.",
  },
  en: {
    eyebrow: "CREATOR STUDIO",
    source: "PROJECT",
    pipeline: "PIPELINE",
    processing: "Processing your video",
    processingCopy: "KIVRYN is turning the file into signals, transcript and rendered clips.",
    cancel: "Cancel processing",
    transcript: "TRANSCRIPT",
    candidates: "CANDIDATES",
    candidateNote: "Candidates are analysis/timestamps. Only rendered clips have a real file.",
    clips: "RENDERED CLIPS",
    noClips: "Rendered videos will appear here when the worker finishes.",
    potential: "Content Potential",
    signal: "Internal signal — not a virality guarantee.",
    excerpt: "EXCERPT",
    download: "Download video",
    downloading: "Preparing download…",
    share: "Share",
    sharing: "Preparing share…",
    rerender: "Rerender clip",
    rerendering: "Queueing render…",
    package: "Create caption and posting package",
    projectAI: "Analyze project with KIVRYN",
    aiCopy: "Compare the real clips in this project and decide which one deserves work first.",
    outputReady: "Rendered export",
    outputWaiting: "Rendering pending",
    invalid: "Project not found",
    settings: "SETTINGS",
    captions: "Captions",
    on: "ON",
    off: "OFF",
    refreshes: "Auto-refreshes every 5 seconds while processing.",
  },
} as const;

const activeStages = new Set(["queued", "analyzing", "transcribing", "selecting_clips", "rendering"]);

export default function CreatorProjectScreen() {
  const params = useLocalSearchParams<{ projectId?: string | string[] }>();
  const id = typeof params.projectId === "string" ? params.projectId : "";
  const { session } = useAuth();
  const { resolvedLocale } = useLanguage();
  const language = resolvedLocale?.startsWith("en") ? "en" : "pt-BR";
  const c = copy[language];
  const [project, setProject] = useState<CreatorProject | null>();
  const [job, setJob] = useState<CreatorJob | null>(null);
  const [clips, setClips] = useState<CreatorClip[]>([]);
  const [candidates, setCandidates] = useState<CreatorClipCandidate[]>([]);
  const [transcript, setTranscript] = useState<CreatorTranscript | null>(null);
  const [exportingClip, setExportingClip] = useState<string | null>(null);
  const [sharingClip, setSharingClip] = useState<string | null>(null);
  const [rerenderingClip, setRerenderingClip] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user.id || !id) {
      setProject(null);
      return;
    }
    let mounted = true;
    const load = () =>
      Promise.all([
        getCreatorProject(session.user.id, id),
        getLatestCreatorJob(session.user.id, id),
        listCreatorClipCandidates(session.user.id, id),
        listCreatorClips(session.user.id, id),
      ])
        .then(async ([nextProject, current, nextCandidates, results]) => {
          const nextTranscript = current
            ? await getCreatorTranscript(session.user.id, current.id)
            : null;
          if (!mounted) return;
          setProject(nextProject);
          setJob(current);
          setCandidates(nextCandidates);
          setTranscript(nextTranscript);
          setClips(results);
        })
        .catch(() => mounted && setProject(null));
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [id, session?.user.id]);

  const stage = job?.progressStage ?? job?.status ?? project?.status ?? "draft";
  const pipelineProgress =
    job?.progressPercent != null
      ? Math.max(0, Math.min(100, job.progressPercent))
      : job?.status === "completed"
        ? 100
        : 0;
  const bestClip = useMemo(() => [...clips].sort((a, b) => a.rank - b.rank)[0] ?? null, [clips]);

  const downloadExport = async (clip: CreatorClip) => {
    if (!clip.outputPath || exportingClip) return;
    setExportingClip(clip.id);
    try {
      const exported = await requestCreatorExport(clip.id);
      await Linking.openURL(exported.signedUrl);
    } finally {
      setExportingClip(null);
    }
  };

  const shareExport = async (clip: CreatorClip) => {
    if (!clip.outputPath || sharingClip) return;
    setSharingClip(clip.id);
    try {
      const message =
        language === "en"
          ? `KIVRYN Creator Studio export · ${project?.title ?? "Video"}`
          : `Export do KIVRYN Creator Studio · ${project?.title ?? "Vídeo"}`;
      await shareCreatorExport(clip.id, message);
    } finally {
      setSharingClip(null);
    }
  };

  const rerenderClip = async (clip: CreatorClip) => {
    if (rerenderingClip) return;
    setRerenderingClip(clip.id);
    try {
      await requestClipRerender(clip.id, {
        startMs: clip.startMs,
        endMs: clip.endMs,
        aspectRatio: clip.aspectRatio,
        captionsEnabled: clip.captionsEnabled,
      });
      if (session?.user.id) {
        const current = await getLatestCreatorJob(session.user.id, id);
        setJob(current);
      }
    } finally {
      setRerenderingClip(null);
    }
  };

  const openClipAI = (clip: CreatorClip) => {
    const context =
      language === "en"
        ? `Create a complete posting package for this real Creator Studio clip. Project: ${project?.title ?? ""}. Duration: ${Math.round(clip.durationMs / 1000)} seconds. Aspect ratio: ${clip.aspectRatio}. Content Potential signal: ${clip.score}/100. Selection reason: ${clip.scoreReason}. Transcript excerpt: ${clip.transcriptExcerpt}. Return: 3 strong hook/title options, one ready-to-copy caption/description, CTA, platform adaptations for YouTube Shorts, Instagram Reels, TikTok and Facebook, and a compact hashtag set. Put the final ready-to-copy description in its own block. Do not promise virality or invent analytics.`
        : `Crie um pacote de postagem completo para este corte real do Creator Studio. Projeto: ${project?.title ?? ""}. Duração: ${Math.round(clip.durationMs / 1000)} segundos. Formato: ${clip.aspectRatio}. Sinal Content Potential: ${clip.score}/100. Motivo da seleção: ${clip.scoreReason}. Trecho da transcrição: ${clip.transcriptExcerpt}. Entregue: 3 opções fortes de hook/título, uma descrição pronta para copiar, CTA, adaptações para YouTube Shorts, Instagram Reels, TikTok e Facebook e um conjunto compacto de hashtags. Coloque a descrição final pronta para copiar em um bloco próprio. Não prometa viralidade nem invente analytics.`;
    router.push({ pathname: "/assistant", params: { context } });
  };

  const openProjectAI = () => {
    const clipSummary = clips
      .slice(0, 8)
      .map((clip) => `#${clip.rank}: ${clip.score}/100 · ${Math.round(clip.durationMs / 1000)}s · ${clip.scoreReason}`)
      .join("\n");
    const context =
      language === "en"
        ? `Act as KIVRYN Creator Intelligence for this real Creator Studio project. Project: ${project?.title ?? ""}. Clips found: ${clips.length}. Best ranked clip: ${bestClip ? `#${bestClip.rank}, signal ${bestClip.score}/100` : "none yet"}. Compare only the available signals and recommend which clip to work on first, why, and one concrete distribution experiment. Clips:\n${clipSummary || "No clips ready yet."}`
        : `Atue como KIVRYN Creator Intelligence neste projeto real do Creator Studio. Projeto: ${project?.title ?? ""}. Cortes encontrados: ${clips.length}. Melhor corte ranqueado: ${bestClip ? `#${bestClip.rank}, sinal ${bestClip.score}/100` : "nenhum ainda"}. Compare somente os sinais disponíveis e recomende qual corte trabalhar primeiro, por quê e um experimento concreto de distribuição. Cortes:\n${clipSummary || "Ainda não há cortes prontos."}`;
    router.push({ pathname: "/assistant", params: { context } });
  };

  return (
    <AppScreen scroll contentContainerStyle={s.page}>
      {project === undefined ? (
        <Text style={s.copy}>Loading…</Text>
      ) : project === null ? (
        <Text style={s.title}>{c.invalid}</Text>
      ) : (
        <>
          <View style={s.hero}>
            <Text style={s.eyebrow}>{c.eyebrow}</Text>
            <Text style={s.title}>{project.title}</Text>
            <View style={s.metaRow}>
              <Text style={s.meta}>{project.aspectRatio}</Text>
              <Text style={s.meta}>{c.captions}: {project.captionsEnabled ? c.on : c.off}</Text>
              <Text style={s.meta}>{project.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={s.pipelineCard}>
            <View style={s.pipelineTop}>
              <View style={s.flex}>
                <Text style={s.eyebrow}>{c.pipeline}</Text>
                <Text style={s.cardTitle}>{activeStages.has(job?.status ?? "") ? c.processing : stage.replaceAll("_", " ")}</Text>
              </View>
              <Text style={s.percent}>{pipelineProgress}%</Text>
            </View>
            <View style={s.track}>
              <View style={[s.fill, { width: `${pipelineProgress}%` }]} />
            </View>
            <Text style={s.copy}>{c.processingCopy}</Text>
            <Text style={s.meta}>{c.refreshes}</Text>
            {job?.errorCode ? <Text style={s.error}>{job.errorCode}</Text> : null}
            {job && activeStages.has(job.status) ? (
              <Pressable style={s.cancelButton} onPress={() => void cancelCreatorJob(job.id)}>
                <Text style={s.cancelText}>{c.cancel}</Text>
              </Pressable>
            ) : null}
          </View>

          {transcript ? (
            <View style={s.pipelineCard}>
              <Text style={s.eyebrow}>{c.transcript}</Text>
              <Text style={s.cardTitle}>
                {transcript.language} · {transcript.segmentCount} {language === "en" ? "segments" : "segmentos"}
              </Text>
              <Text numberOfLines={8} style={s.copy}>{transcript.fullText}</Text>
            </View>
          ) : null}

          <View style={s.pipelineCard}>
            <Text style={s.eyebrow}>{c.candidates}</Text>
            <Text style={s.copy}>{c.candidateNote}</Text>
            {candidates.length === 0 ? (
              <Text style={s.copy}>{language === "en" ? "No candidates persisted yet." : "Nenhum candidate persistido ainda."}</Text>
            ) : (
              candidates.map((candidate) => (
                <View key={candidate.id} style={s.excerptBox}>
                  <Text style={s.cardTitle}>
                    #{candidate.rank} · Creator Score {candidate.score}/100 · {candidate.status}
                  </Text>
                  <Text style={s.meta}>
                    {(candidate.startMs / 1000).toFixed(1)}s → {(candidate.endMs / 1000).toFixed(1)}s · {Math.round(candidate.durationMs / 1000)}s · {candidate.aspectRatio}
                  </Text>
                  {candidate.hookExcerpt ? <Text style={s.signalNotice}>{candidate.hookExcerpt}</Text> : null}
                  <Text numberOfLines={4} style={s.copy}>{candidate.transcriptExcerpt}</Text>
                </View>
              ))
            )}
          </View>

          <View style={s.aiCard}>
            <Text style={s.eyebrow}>KIVRYN CREATOR INTELLIGENCE</Text>
            <Text style={s.cardTitle}>{c.projectAI}</Text>
            <Text style={s.copy}>{c.aiCopy}</Text>
            <Pressable style={s.outlineButton} onPress={openProjectAI}>
              <Text style={s.outlineText}>{c.projectAI}</Text>
            </Pressable>
          </View>

          <Text style={s.eyebrow}>{c.clips}</Text>
          {clips.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.copy}>{c.noClips}</Text>
            </View>
          ) : (
            clips.map((clip) => (
              <View key={clip.id} style={[s.clipCard, clip.rank === 1 && s.bestClip]}>
                <View style={s.clipTop}>
                  <View style={s.rankBadge}>
                    <Text style={s.rankText}>#{clip.rank}</Text>
                  </View>
                  <View style={s.flex}>
                    <Text style={s.cardTitle}>{c.potential} · {clip.score}/100</Text>
                    <Text style={s.meta}>{Math.round(clip.durationMs / 1000)}s · {clip.aspectRatio} · {clip.captionsEnabled ? "Captions ON" : "Captions OFF"}</Text>
                  </View>
                </View>
                <Text style={s.signalNotice}>{c.signal}</Text>
                <Text style={s.copy}>{clip.scoreReason}</Text>
                <View style={s.excerptBox}>
                  <Text style={s.eyebrow}>{c.excerpt}</Text>
                  <Text style={s.excerpt}>{clip.transcriptExcerpt}</Text>
                </View>
                <Text style={clip.outputPath ? s.ready : s.waiting}>
                  {clip.outputPath ? c.outputReady : c.outputWaiting}
                </Text>
                <View style={s.actions}>
                  {clip.outputPath ? (
                    <>
                      <Pressable
                        style={s.primaryButton}
                        disabled={exportingClip === clip.id}
                        onPress={() => void downloadExport(clip)}
                      >
                        <Text style={s.primaryText}>{exportingClip === clip.id ? c.downloading : c.download}</Text>
                      </Pressable>
                      <Pressable
                        style={s.outlineButton}
                        disabled={sharingClip === clip.id}
                        onPress={() => void shareExport(clip)}
                      >
                        <Text style={s.outlineText}>{sharingClip === clip.id ? c.sharing : c.share}</Text>
                      </Pressable>
                    </>
                  ) : null}
                  <Pressable
                    style={s.outlineButton}
                    disabled={rerenderingClip !== null}
                    onPress={() => void rerenderClip(clip)}
                  >
                    <Text style={s.outlineText}>
                      {rerenderingClip === clip.id ? c.rerendering : c.rerender}
                    </Text>
                  </Pressable>
                  <Pressable style={s.outlineButton} onPress={() => openClipAI(clip)}>
                    <Text style={s.outlineText}>{c.package}</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </>
      )}
    </AppScreen>
  );
}

const s = StyleSheet.create({
  page: { gap: spacing.lg, paddingBottom: spacing.xxl },
  hero: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.canvasElevated,
    ...shadows.illuminated,
  },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  title: { ...typography.title, color: colors.text },
  cardTitle: { ...typography.heading, color: colors.text },
  copy: { ...typography.body, color: colors.textSecondary },
  meta: { ...typography.caption, color: colors.textMuted },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pipelineCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pipelineTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
  percent: { ...typography.title, color: colors.primaryBright },
  track: { height: 8, overflow: "hidden", borderRadius: radius.pill, backgroundColor: colors.border },
  fill: { height: "100%", backgroundColor: colors.primaryBright },
  cancelButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  cancelText: { ...typography.label, color: colors.danger },
  aiCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.surfaceRaised,
    ...shadows.raised,
  },
  emptyCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  clipCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  bestClip: { borderColor: colors.borderActive, backgroundColor: colors.surfaceRaised },
  clipTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  rankBadge: {
    minWidth: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.accentMuted,
  },
  rankText: { ...typography.label, color: colors.primaryBright },
  signalNotice: { ...typography.caption, color: colors.warning },
  excerptBox: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.canvasElevated,
  },
  excerpt: { ...typography.body, color: colors.text },
  ready: { ...typography.label, color: colors.success },
  waiting: { ...typography.label, color: colors.textMuted },
  actions: { gap: spacing.sm },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryText: { ...typography.label, color: colors.text },
  outlineButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderActive,
  },
  outlineText: { ...typography.label, color: colors.primaryBright },
  error: { ...typography.body, color: colors.danger },
});
