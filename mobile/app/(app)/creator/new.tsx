import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AppScreen } from "@/components/app-screen";
import { useLanguage } from "@/providers/language-provider";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "expo-router";
import { createAndUploadCreatorVideo, enqueueCreatorProject } from "@/services/creator-service";
import { fetchCreatorYouTubeMetadata, type CreatorYouTubeMetadata } from "@/services/creator-youtube-service";
import {
  CREATOR_ASPECT_RATIOS,
  CREATOR_CLIP_DURATIONS,
  recognizeCreatorUrl,
} from "@/lib/creator";
import { colors, radius, shadows, spacing, typography } from "@/lib/theme";

const copy = {
  "pt-BR": {
    eyebrow: "VIRAL CLIPS STUDIO",
    title: "Transforme um vídeo em vários conteúdos prontos para trabalhar.",
    subtitle:
      "A KIVRYN analisa fala e estrutura, encontra momentos fortes e prepara cortes sem prometer viralidade.",
    source: "1 · FONTE",
    url: "Cole um link do YouTube",
    inspect: "Ler metadados",
    inspecting: "Lendo…",
    metadataOnly: "A URL é usada para contexto e metadados. O arquivo original ainda é necessário para processar o vídeo.",
    videoFound: "Vídeo reconhecido",
    upload: "Selecionar arquivo original",
    selected: "Arquivo selecionado",
    titleLabel: "Nome do projeto",
    output: "2 · SAÍDA",
    format: "Formato",
    duration: "Duração alvo",
    captions: "Legendas automáticas",
    captionsOn: "Ativadas",
    captionsOff: "Desativadas",
    rights: "3 · DIREITOS",
    rightsCopy:
      "Confirmo que tenho os direitos ou autorização necessária para processar este arquivo. Um link público não concede direitos de reutilização.",
    rightsYes: "Confirmar direitos",
    process: "Enviar e analisar vídeo",
    processing: "Enviando…",
    pipeline: "Upload → análise → transcrição → seleção → renderização",
    noDownload: "A KIVRYN não baixa vídeos arbitrariamente do YouTube.",
    invalidUrl: "Use um link HTTPS válido do YouTube.",
    metadataError: "Não foi possível ler os metadados agora. Você ainda pode enviar o arquivo original.",
  },
  en: {
    eyebrow: "VIRAL CLIPS STUDIO",
    title: "Turn one video into multiple pieces of content ready to work with.",
    subtitle:
      "KIVRYN analyzes speech and structure, finds strong moments and prepares clips without promising virality.",
    source: "1 · SOURCE",
    url: "Paste a YouTube link",
    inspect: "Read metadata",
    inspecting: "Reading…",
    metadataOnly: "The URL is used for context and metadata. The original file is still required to process the video.",
    videoFound: "Video recognized",
    upload: "Select original file",
    selected: "File selected",
    titleLabel: "Project name",
    output: "2 · OUTPUT",
    format: "Format",
    duration: "Target duration",
    captions: "Automatic captions",
    captionsOn: "Enabled",
    captionsOff: "Disabled",
    rights: "3 · RIGHTS",
    rightsCopy:
      "I confirm I have the rights or necessary authorization to process this file. A public link does not grant reuse rights.",
    rightsYes: "Confirm rights",
    process: "Upload and analyze video",
    processing: "Uploading…",
    pipeline: "Upload → analysis → transcription → selection → rendering",
    noDownload: "KIVRYN does not download arbitrary YouTube videos.",
    invalidUrl: "Use a valid HTTPS YouTube link.",
    metadataError: "Metadata could not be read right now. You can still upload the original file.",
  },
} as const;

type AspectRatio = (typeof CREATOR_ASPECT_RATIOS)[number];
type ClipDuration = (typeof CREATOR_CLIP_DURATIONS)[number];

export default function NewCreatorProject() {
  const { resolvedLocale } = useLanguage();
  const language = resolvedLocale?.startsWith("en") ? "en" : "pt-BR";
  const c = copy[language];
  const { session } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [metadata, setMetadata] = useState<CreatorYouTubeMetadata | null>(null);
  const [metadataBusy, setMetadataBusy] = useState(false);
  const [metadataError, setMetadataError] = useState("");
  const [file, setFile] = useState<{
    uri: string;
    fileName?: string | null;
    mimeType?: string;
    fileSize?: number;
  }>();
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [targetDuration, setTargetDuration] = useState<ClipDuration>(30);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const recognized = useMemo(() => (url.trim() ? recognizeCreatorUrl(url) : null), [url]);
  const canSubmit = Boolean(session?.user.id && file && title.trim() && rightsConfirmed && !busy);

  const pick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsMultipleSelection: false,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset?.uri.trim()) {
      setFile(asset);
      if (!title.trim() && asset.fileName) setTitle(asset.fileName.replace(/\.[^.]+$/, ""));
    }
  };

  const inspectUrl = async () => {
    if (!recognized?.valid || !recognized.youtube) {
      setMetadataError(c.invalidUrl);
      setMetadata(null);
      return;
    }
    setMetadataBusy(true);
    setMetadataError("");
    try {
      const result = await fetchCreatorYouTubeMetadata(url);
      setMetadata(result);
      if (!title.trim()) setTitle(result.title);
    } catch {
      setMetadata(null);
      setMetadataError(c.metadataError);
    } finally {
      setMetadataBusy(false);
    }
  };

  const submit = async () => {
    if (!session?.user.id || !file || !title.trim() || !rightsConfirmed) return;
    setBusy(true);
    setError("");
    try {
      const id = await createAndUploadCreatorVideo({
        userId: session.user.id,
        title,
        uri: file.uri,
        fileName: file.fileName ?? `video-${Date.now()}.mp4`,
        contentType: file.mimeType ?? "application/octet-stream",
        fileSize: file.fileSize,
        aspectRatio,
        targetDuration,
        captionsEnabled,
      });
      await enqueueCreatorProject(id);
      router.replace({ pathname: "/(app)/creator/[projectId]", params: { projectId: id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "upload_failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen scroll keyboard contentContainerStyle={s.page}>
      <View style={s.hero}>
        <Text style={s.eyebrow}>{c.eyebrow}</Text>
        <Text style={s.title}>{c.title}</Text>
        <Text style={s.copy}>{c.subtitle}</Text>
      </View>

      <View style={s.section}>
        <Text style={s.eyebrow}>{c.source}</Text>
        <TextInput
          accessibilityLabel={c.url}
          autoCapitalize="none"
          keyboardType="url"
          placeholder={c.url}
          placeholderTextColor={colors.textMuted}
          value={url}
          onChangeText={(value) => {
            setUrl(value);
            setMetadata(null);
            setMetadataError("");
          }}
          style={s.input}
        />
        <Pressable
          disabled={metadataBusy || !url.trim()}
          style={[s.outlineButton, (metadataBusy || !url.trim()) && s.disabled]}
          onPress={() => void inspectUrl()}
        >
          <Text style={s.outlineText}>{metadataBusy ? c.inspecting : c.inspect}</Text>
        </Pressable>
        {url.trim() ? <Text style={s.notice}>{c.metadataOnly}</Text> : null}
        {recognized?.youtube ? <Text style={s.notice}>{c.noDownload}</Text> : null}
        {metadataError ? <Text style={s.error}>{metadataError}</Text> : null}
        {metadata ? (
          <View style={s.metadataCard}>
            <Text style={s.eyebrow}>{c.videoFound}</Text>
            <Text style={s.cardTitle}>{metadata.title}</Text>
            <Text style={s.copy}>{metadata.channelTitle}</Text>
            {metadata.durationSeconds !== null ? (
              <Text style={s.meta}>{Math.max(1, Math.round(metadata.durationSeconds / 60))} min</Text>
            ) : null}
          </View>
        ) : null}

        <Pressable style={s.primaryButton} onPress={() => void pick()}>
          <Text style={s.primaryText}>{c.upload}</Text>
        </Pressable>
        {file ? (
          <View style={s.selectedCard}>
            <Text style={s.eyebrow}>{c.selected}</Text>
            <Text style={s.cardTitle}>{file.fileName ?? file.uri.split("/").pop()}</Text>
            {file.fileSize ? <Text style={s.meta}>{(file.fileSize / 1024 / 1024).toFixed(1)} MB</Text> : null}
          </View>
        ) : null}
        <TextInput
          accessibilityLabel={c.titleLabel}
          placeholder={c.titleLabel}
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          style={s.input}
          maxLength={120}
        />
      </View>

      <View style={s.section}>
        <Text style={s.eyebrow}>{c.output}</Text>
        <Text style={s.heading}>{c.format}</Text>
        <View style={s.row}>
          {CREATOR_ASPECT_RATIOS.map((value) => (
            <Pressable
              key={value}
              style={[s.chip, aspectRatio === value && s.chipSelected]}
              onPress={() => setAspectRatio(value)}
            >
              <Text style={[s.chipText, aspectRatio === value && s.chipTextSelected]}>{value}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.heading}>{c.duration}</Text>
        <View style={s.row}>
          {CREATOR_CLIP_DURATIONS.map((value) => (
            <Pressable
              key={value}
              style={[s.chip, targetDuration === value && s.chipSelected]}
              onPress={() => setTargetDuration(value)}
            >
              <Text style={[s.chipText, targetDuration === value && s.chipTextSelected]}>{value}s</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.heading}>{c.captions}</Text>
        <View style={s.row}>
          <Pressable style={[s.chip, captionsEnabled && s.chipSelected]} onPress={() => setCaptionsEnabled(true)}>
            <Text style={[s.chipText, captionsEnabled && s.chipTextSelected]}>{c.captionsOn}</Text>
          </Pressable>
          <Pressable style={[s.chip, !captionsEnabled && s.chipSelected]} onPress={() => setCaptionsEnabled(false)}>
            <Text style={[s.chipText, !captionsEnabled && s.chipTextSelected]}>{c.captionsOff}</Text>
          </Pressable>
        </View>
        <Text style={s.pipeline}>{c.pipeline}</Text>
      </View>

      <View style={s.rightsCard}>
        <Text style={s.eyebrow}>{c.rights}</Text>
        <Text style={s.copy}>{c.rightsCopy}</Text>
        <Pressable style={s.rightsRow} onPress={() => setRightsConfirmed((value) => !value)}>
          <View style={[s.checkbox, rightsConfirmed && s.checkboxSelected]}>
            {rightsConfirmed ? <Text style={s.check}>✓</Text> : null}
          </View>
          <Text style={s.body}>{c.rightsYes}</Text>
        </Pressable>
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}
      <Pressable
        disabled={!canSubmit}
        style={[s.processButton, !canSubmit && s.disabled]}
        onPress={() => void submit()}
      >
        <Text style={s.processText}>{busy ? c.processing : c.process}</Text>
      </Pressable>
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
  heading: { ...typography.heading, color: colors.text },
  cardTitle: { ...typography.heading, color: colors.text },
  body: { ...typography.body, color: colors.text },
  copy: { ...typography.body, color: colors.textSecondary },
  meta: { ...typography.caption, color: colors.textMuted },
  notice: { ...typography.caption, color: colors.textMuted },
  section: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.canvasElevated,
  },
  primaryButton: {
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  primaryText: { ...typography.label, color: colors.text },
  outlineButton: {
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderActive,
    borderRadius: radius.md,
  },
  outlineText: { ...typography.label, color: colors.primaryBright },
  metadataCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.surfaceRaised,
  },
  selectedCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.canvasElevated,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvasElevated,
  },
  chipSelected: { borderColor: colors.primaryBright, backgroundColor: colors.accentMuted },
  chipText: { ...typography.label, color: colors.textMuted },
  chipTextSelected: { color: colors.primaryBright },
  pipeline: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rightsCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.surfaceRaised,
  },
  rightsRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  checkbox: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.canvasElevated,
  },
  checkboxSelected: { borderColor: colors.primaryBright, backgroundColor: colors.accentMuted },
  check: { ...typography.label, color: colors.primaryBright },
  processButton: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    ...shadows.illuminated,
  },
  processText: { ...typography.heading, color: colors.text },
  error: { ...typography.body, color: colors.danger },
  disabled: { opacity: 0.45 },
});
