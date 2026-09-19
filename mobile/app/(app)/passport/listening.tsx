import * as Speech from "expo-speech";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { router } from "expo-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { usePassportHome } from "@/hooks/use-passport";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";
import { transcribeVoiceRecording } from "@/services/assistant-voice-service";

const copy = {
  "pt-BR": {
    title: "Listening do Passport",
    subtitle: "Treine compreensão auditiva com voz sintetizada no idioma do seu Passport.",
    loading: "Preparando prática de listening…",
    errorTitle: "Não foi possível preparar o listening.",
    errorBody: "Seus dados não foram alterados. Verifique a conexão e tente novamente.",
    retry: "Tentar novamente",
    noProfileTitle: "Configure seu Passport primeiro",
    noProfileBody: "O listening precisa de um idioma principal configurado.",
    configure: "Configurar Passport",
    placementTitle: "Conclua o teste de nível primeiro",
    placementBody: "Seu nível precisa ser definido antes de iniciar as práticas do Passport.",
    placementAction: "Fazer teste de nível",
    noContentTitle: "Ainda não há frases para listening",
    noContentBody: "Quando suas lições ou revisões tiverem exemplos disponíveis, eles aparecerão aqui para treino auditivo.",
    back: "Voltar ao Passport",
    system: "SYNTHESIZED LISTENING",
    language: "Idioma",
    source: "Fonte",
    phrase: "Frase",
    hidden: "Texto oculto para você ouvir primeiro.",
    reveal: "Revelar texto",
    hide: "Ocultar texto",
    play: "Ouvir",
    replay: "Ouvir novamente",
    stop: "Parar",
    slow: "Lento",
    normal: "Normal",
    previous: "Anterior",
    next: "Próxima",
    voiceNote: "A voz é sintetizada pelo mecanismo de fala do aparelho. O Passport não apresenta isso como áudio humano nem atribui nota de pronúncia.",
    speaking: "Reproduzindo…",
    speechError: "Não foi possível reproduzir esta frase neste aparelho.",
    lessonSource: "Lição",
    vocabularySource: "Vocabulário",
    repeat: "Repetir e comparar",
    stopRecording: "Parar gravação",
    transcribing: "Transcrevendo sua fala…",
    heard: "A KIVRYN ouviu",
    textMatch: "Correspondência de texto",
    pronunciationNote: "A comparação usa somente a transcrição reconhecida. Não é uma nota de sotaque ou pronúncia.",
    microphoneDenied: "Permita o acesso ao microfone para praticar repetição.",
    repeatError: "Não foi possível analisar esta gravação.",
  },
  en: {
    title: "Passport Listening",
    subtitle: "Train listening comprehension with synthesized speech in your Passport language.",
    loading: "Preparing listening practice…",
    errorTitle: "Listening practice could not be prepared.",
    errorBody: "Your data was not changed. Check your connection and try again.",
    retry: "Try again",
    noProfileTitle: "Set up your Passport first",
    noProfileBody: "Listening practice needs a primary language.",
    configure: "Set up Passport",
    placementTitle: "Complete your placement test first",
    placementBody: "Your level must be set before starting Passport practice.",
    placementAction: "Take placement test",
    noContentTitle: "No listening phrases yet",
    noContentBody: "When your lessons or reviews contain examples, they will appear here for listening practice.",
    back: "Back to Passport",
    system: "SYNTHESIZED LISTENING",
    language: "Language",
    source: "Source",
    phrase: "Phrase",
    hidden: "Text is hidden so you can listen first.",
    reveal: "Reveal text",
    hide: "Hide text",
    play: "Listen",
    replay: "Listen again",
    stop: "Stop",
    slow: "Slow",
    normal: "Normal",
    previous: "Previous",
    next: "Next",
    voiceNote: "Speech is synthesized by the device speech engine. Passport does not present it as human audio and does not assign pronunciation scores.",
    speaking: "Playing…",
    speechError: "This phrase could not be played on this device.",
    lessonSource: "Lesson",
    vocabularySource: "Vocabulary",
    repeat: "Repeat and compare",
    stopRecording: "Stop recording",
    transcribing: "Transcribing your speech…",
    heard: "KIVRYN heard",
    textMatch: "Text match",
    pronunciationNote: "The comparison uses recognized transcription only. It is not an accent or pronunciation score.",
    microphoneDenied: "Allow microphone access to practice repetition.",
    repeatError: "This recording could not be analyzed.",
  },
} as const;

type ListeningItem = {
  id: string;
  title: string;
  text: string;
  source: "lesson" | "vocabulary";
};

type SpeechOptionsCompat = {
  language?: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: () => void;
};

const speakWithOptions = Speech.speak as unknown as (
  text: string,
  options?: SpeechOptionsCompat,
) => void;

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function normalizedWords(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function textMatchPercent(expected: string, heard: string) {
  const target = normalizedWords(expected);
  const actual = normalizedWords(heard);
  if (!target.length || !actual.length) return 0;
  const remaining = [...actual];
  let matched = 0;
  for (const word of target) {
    const index = remaining.indexOf(word);
    if (index >= 0) {
      matched += 1;
      remaining.splice(index, 1);
    }
  }
  return Math.round((matched / Math.max(target.length, actual.length)) * 100);
}

function speechLocale(trackSlug: string) {
  const slug = trackSlug.trim().toLowerCase();
  if (slug === "spanish") return "es-ES";
  if (slug === "portuguese") return "pt-BR";
  if (slug === "french") return "fr-FR";
  return "en-US";
}

export default function PassportListening() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const missionDate = useMemo(localDateKey, []);
  const passport = usePassportHome(missionDate);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 200);
  const [transcribing, setTranscribing] = useState(false);
  const [heardText, setHeardText] = useState("");
  const [matchPercent, setMatchPercent] = useState<number | null>(null);
  const [repeatErrorMessage, setRepeatErrorMessage] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [rate, setRate] = useState<0.72 | 0.94>(0.94);
  const [speaking, setSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState(false);

  const profile = passport.data?.profile ?? null;
  const track = profile
    ? passport.data?.tracks.find((item) => item.id === profile.trackId) ?? null
    : null;
  const locale = speechLocale(track?.slug ?? "english");

  const items = useMemo<ListeningItem[]>(() => {
    const lessonItems = (passport.data?.lessons ?? []).flatMap((lesson) => {
      const listening = textValue(lesson.content.listening);
      const example = textValue(lesson.content.example);
      const phrase = listening || example;
      if (!phrase) return [];
      return [
        {
          id: `lesson-${lesson.id}`,
          title: lesson.title,
          text: phrase,
          source: "lesson" as const,
        },
      ];
    });

    if (lessonItems.length) return lessonItems;

    return (passport.data?.dueVocabulary ?? []).flatMap((item) => {
      const phrase = item.context.trim() || item.term.trim();
      if (!phrase) return [];
      return [
        {
          id: `vocabulary-${item.id}`,
          title: item.term,
          text: phrase,
          source: "vocabulary" as const,
        },
      ];
    });
  }, [passport.data?.dueVocabulary, passport.data?.lessons]);

  const safeIndex = Math.min(currentIndex, Math.max(0, items.length - 1));
  const current = items[safeIndex] ?? null;

  useEffect(() => {
    return () => {
      void Speech.stop();
      void audioRecorder.stop().catch(() => undefined);
      void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    };
  }, [audioRecorder]);

  useEffect(() => {
    setCurrentIndex(0);
    setRevealed(false);
    setSpeechError(false);
    setHeardText("");
    setMatchPercent(null);
    setRepeatErrorMessage("");
    void Speech.stop();
    setSpeaking(false);
  }, [profile?.trackId]);

  if (passport.isPending) return <LoadingState title={text.loading} />;
  if (passport.isError) {
    return (
      <ErrorState
        title={text.errorTitle}
        message={text.errorBody}
        actionLabel={text.retry}
        onAction={() => void passport.refetch()}
      />
    );
  }

  if (!profile) {
    return (
      <AppScreen scroll contentContainerStyle={styles.page}>
        <StandardHeader title={text.title} subtitle={text.subtitle} />
        <StateCard title={text.noProfileTitle} body={text.noProfileBody}>
          <PrimaryButton label={text.configure} onPress={() => router.replace("/passport/setup")} />
        </StateCard>
      </AppScreen>
    );
  }

  if (profile.placementScore == null) {
    return (
      <AppScreen scroll contentContainerStyle={styles.page}>
        <StandardHeader title={text.title} subtitle={text.subtitle} />
        <StateCard title={text.placementTitle} body={text.placementBody}>
          <PrimaryButton label={text.placementAction} onPress={() => router.replace("/passport/placement")} />
        </StateCard>
      </AppScreen>
    );
  }

  async function stopSpeech() {
    await Speech.stop();
    setSpeaking(false);
  }

  async function speakCurrent() {
    if (!current || recorderState.isRecording || transcribing) return;
    setSpeechError(false);
    await Speech.stop();
    speakWithOptions(current.text, {
      language: locale,
      rate,
      pitch: 1,
      onStart: () => setSpeaking(true),
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => {
        setSpeaking(false);
        setSpeechError(true);
      },
    });
  }

  async function startRepeat() {
    if (!current || transcribing || recorderState.isRecording) return;
    setRepeatErrorMessage("");
    setHeardText("");
    setMatchPercent(null);
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setRepeatErrorMessage(text.microphoneDenied);
      return;
    }
    await Speech.stop();
    setSpeaking(false);
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  }

  async function stopRepeat() {
    if (!current || !recorderState.isRecording || transcribing) return;
    setTranscribing(true);
    setRepeatErrorMessage("");
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error("missing_recording");
      const transcript = await transcribeVoiceRecording(uri, locale);
      setHeardText(transcript);
      setMatchPercent(textMatchPercent(current.text, transcript));
    } catch {
      setRepeatErrorMessage(text.repeatError);
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
      setTranscribing(false);
    }
  }

  async function move(delta: number) {
    if (recorderState.isRecording || transcribing) return;
    await Speech.stop();
    setSpeaking(false);
    setSpeechError(false);
    setRevealed(false);
    setHeardText("");
    setMatchPercent(null);
    setRepeatErrorMessage("");
    setCurrentIndex((value) => Math.min(items.length - 1, Math.max(0, value + delta)));
  }

  if (!current) {
    return (
      <AppScreen scroll contentContainerStyle={styles.page}>
        <StandardHeader title={text.title} subtitle={text.subtitle} />
        <Pressable onPress={() => router.replace("/passport")} style={styles.backButton}>
          <Text style={styles.backText}>‹ {text.back}</Text>
        </Pressable>
        <StateCard title={text.noContentTitle} body={text.noContentBody}>
          <PrimaryButton label={text.back} onPress={() => router.replace("/passport")} />
        </StateCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll contentContainerStyle={styles.page}>
      <StandardHeader title={text.title} subtitle={text.subtitle} />

      <Pressable accessibilityRole="button" onPress={() => router.replace("/passport")} style={styles.backButton}>
        <Text style={styles.backText}>‹ {text.back}</Text>
      </Pressable>

      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <Text style={styles.eyebrow}>{text.system}</Text>
          <Text style={styles.counter}>{safeIndex + 1}/{items.length}</Text>
        </View>
        <Text style={styles.heroTitle}>{track?.title ?? text.language}</Text>
        <Text style={styles.heroBody}>{text.voiceNote}</Text>
      </View>

      <View style={styles.practiceCard}>
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>{text.source}</Text>
            <Text style={styles.metaValue}>
              {current.source === "lesson" ? text.lessonSource : text.vocabularySource}
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>{text.language}</Text>
            <Text style={styles.metaValue}>{locale}</Text>
          </View>
        </View>

        <Text style={styles.itemTitle}>{current.title}</Text>

        <View style={styles.listenPanel}>
          <Text style={styles.listenLabel}>{text.phrase}</Text>
          {revealed ? (
            <Text style={styles.phraseText}>{current.text}</Text>
          ) : (
            <Text style={styles.hiddenText}>{text.hidden}</Text>
          )}
        </View>

        {speechError ? <Text style={styles.errorText}>{text.speechError}</Text> : null}
        {repeatErrorMessage ? <Text style={styles.errorText}>{repeatErrorMessage}</Text> : null}
        {speaking ? <Text style={styles.speakingText}>{text.speaking}</Text> : null}
        {transcribing ? <Text style={styles.speakingText}>{text.transcribing}</Text> : null}

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void speakCurrent()}
            style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
          >
            <Text style={styles.primaryActionText}>{speaking ? text.replay : text.play}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void stopSpeech()}
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryActionText}>{text.stop}</Text>
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: rate === 0.72 }}
            onPress={() => setRate(0.72)}
            style={({ pressed }) => [
              styles.modeAction,
              rate === 0.72 && styles.modeActionSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.modeActionText, rate === 0.72 && styles.modeActionTextSelected]}>{text.slow}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: rate === 0.94 }}
            onPress={() => setRate(0.94)}
            style={({ pressed }) => [
              styles.modeAction,
              rate === 0.94 && styles.modeActionSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.modeActionText, rate === 0.94 && styles.modeActionTextSelected]}>{text.normal}</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: transcribing }}
          disabled={transcribing}
          onPress={() => (recorderState.isRecording ? void stopRepeat() : void startRepeat())}
          style={({ pressed }) => [
            styles.repeatButton,
            recorderState.isRecording && styles.repeatButtonRecording,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.repeatButtonText}>
            {recorderState.isRecording ? text.stopRecording : text.repeat}
          </Text>
        </Pressable>

        {heardText ? (
          <View style={styles.repeatResult}>
            <Text style={styles.repeatLabel}>{text.heard}</Text>
            <Text style={styles.repeatTranscript}>{heardText}</Text>
            <Text style={styles.repeatScore}>{text.textMatch}: {matchPercent ?? 0}%</Text>
            <Text style={styles.repeatNote}>{text.pronunciationNote}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => setRevealed((value) => !value)}
          style={({ pressed }) => [styles.revealButton, pressed && styles.pressed]}
        >
          <Text style={styles.revealText}>{revealed ? text.hide : text.reveal}</Text>
        </Pressable>
      </View>

      <View style={styles.navigationRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: safeIndex === 0 }}
          disabled={safeIndex === 0}
          onPress={() => void move(-1)}
          style={({ pressed }) => [
            styles.navButton,
            safeIndex === 0 && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.navText}>‹ {text.previous}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: safeIndex >= items.length - 1 }}
          disabled={safeIndex >= items.length - 1}
          onPress={() => void move(1)}
          style={({ pressed }) => [
            styles.navButton,
            safeIndex >= items.length - 1 && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.navText}>{text.next} ›</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

function StateCard({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {children}
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: spacing.xl },
  backButton: { alignSelf: "flex-start", marginTop: spacing.md, paddingVertical: spacing.sm },
  backText: { ...typography.label, color: colors.textSecondary },
  hero: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  counter: { ...typography.label, color: colors.textMuted },
  heroTitle: { ...typography.title, color: colors.text, marginTop: spacing.sm },
  heroBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  practiceCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.canvasElevated,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metaChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  metaLabel: { ...typography.caption, color: colors.textMuted },
  metaValue: { ...typography.label, color: colors.text, marginTop: spacing.xs },
  itemTitle: { ...typography.heading, color: colors.text, marginTop: spacing.lg },
  listenPanel: {
    minHeight: 150,
    marginTop: spacing.md,
    padding: spacing.lg,
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  listenLabel: { ...typography.eyebrow, color: colors.primaryBright },
  phraseText: { ...typography.heading, color: colors.text, marginTop: spacing.md },
  hiddenText: { ...typography.body, color: colors.textMuted, marginTop: spacing.md },
  errorText: { ...typography.caption, color: colors.danger, marginTop: spacing.md },
  speakingText: { ...typography.caption, color: colors.success, marginTop: spacing.md },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  primaryAction: {
    flex: 1,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  primaryActionText: { ...typography.label, color: colors.text },
  secondaryAction: {
    flex: 1,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryActionText: { ...typography.label, color: colors.textSecondary },
  modeAction: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modeActionSelected: { borderColor: colors.primaryBright, backgroundColor: colors.surfaceRaised },
  modeActionText: { ...typography.label, color: colors.textMuted },
  modeActionTextSelected: { color: colors.primaryBright },
  repeatButton: {
    minHeight: 50,
    marginTop: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryBright,
    backgroundColor: colors.surfaceRaised,
  },
  repeatButtonRecording: { borderColor: colors.danger },
  repeatButtonText: { ...typography.label, color: colors.primaryBright },
  repeatResult: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  repeatLabel: { ...typography.eyebrow, color: colors.textMuted },
  repeatTranscript: { ...typography.body, color: colors.text, marginTop: spacing.sm },
  repeatScore: { ...typography.heading, color: colors.primaryBright, marginTop: spacing.md },
  repeatNote: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  revealButton: {
    minHeight: 48,
    marginTop: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderActive,
  },
  revealText: { ...typography.label, color: colors.primaryBright },
  navigationRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  navButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  navText: { ...typography.label, color: colors.textSecondary },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.82 },
  stateCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stateTitle: { ...typography.heading, color: colors.text },
  stateBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  primaryButton: {
    minHeight: 52,
    marginTop: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  primaryButtonText: { ...typography.label, color: colors.text },
});
