import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { ErrorState, LoadingState } from "@/components/screen-state";
import {
  useCompletePassportLesson,
  usePassportHome,
  usePassportLessons,
  useStartPassportLesson,
} from "@/hooks/use-passport";
import { useSubscription } from "@/hooks/use-subscription";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";

const copy = {
  "pt-BR": {
    title: "Lição do Passport",
    subtitle: "Aprenda, pratique e registre progresso real no seu plano internacional.",
    loading: "Carregando lição…",
    errorTitle: "Não foi possível carregar esta lição.",
    errorBody: "Seu progresso não foi alterado. Verifique a conexão e tente novamente.",
    retry: "Tentar novamente",
    noProfileTitle: "Configure seu Passport primeiro",
    noProfileBody: "Esta lição precisa de um perfil Passport com idioma principal.",
    configure: "Configurar Passport",
    notFoundTitle: "Lição não encontrada",
    notFoundBody: "Esta lição não pertence ao seu idioma atual ou não está mais disponível.",
    back: "Voltar ao Passport",
    lesson: "PASSPORT LESSON",
    difficulty: "Dificuldade",
    duration: "Duração",
    minutes: "min",
    type: "Tipo",
    explanation: "EXPLICAÇÃO",
    example: "EXEMPLO",
    exercise: "EXERCÍCIO",
    practicalTask: "TAREFA PRÁTICA",
    noContent: "Esta lição ainda não possui conteúdo textual disponível.",
    response: "SUA RESPOSTA",
    responsePlaceholder: "Escreva sua resposta para a atividade…",
    responseNote: "Sua resposta fica apenas nesta tela; o Passport registra a conclusão, não o texto digitado.",
    complete: "Concluir lição",
    completing: "Registrando progresso…",
    completeError: "Não foi possível concluir a lição. Sua resposta continua nesta tela; tente novamente.",
    completed: "LIÇÃO CONCLUÍDA",
    completedBody: "Esta lição já está registrada como concluída no seu progresso.",
    resultTitle: "Progresso registrado",
    xp: "XP recebido",
    streak: "Sequência",
    streakDays: "dias",
    continue: "Continuar no Passport",
    premium: "LIÇÃO PREMIUM",
    premiumTitle: "Esta lição requer KIVRYN Premium",
    premiumBody: "Seu progresso atual foi preservado. Desbloqueie o Premium para acessar este conteúdo.",
    openPremium: "Ver KIVRYN Premium",
  },
  en: {
    title: "Passport lesson",
    subtitle: "Learn, practice and record real progress in your international plan.",
    loading: "Loading lesson…",
    errorTitle: "This lesson could not be loaded.",
    errorBody: "Your progress was not changed. Check the connection and try again.",
    retry: "Try again",
    noProfileTitle: "Set up your Passport first",
    noProfileBody: "This lesson needs a Passport profile with a primary language.",
    configure: "Set up Passport",
    notFoundTitle: "Lesson not found",
    notFoundBody: "This lesson does not belong to your current language or is no longer available.",
    back: "Back to Passport",
    lesson: "PASSPORT LESSON",
    difficulty: "Difficulty",
    duration: "Duration",
    minutes: "min",
    type: "Type",
    explanation: "EXPLANATION",
    example: "EXAMPLE",
    exercise: "EXERCISE",
    practicalTask: "PRACTICAL TASK",
    noContent: "This lesson does not have textual content available yet.",
    response: "YOUR RESPONSE",
    responsePlaceholder: "Write your response to the activity…",
    responseNote: "Your response stays on this screen; Passport records completion, not the text you type.",
    complete: "Complete lesson",
    completing: "Saving progress…",
    completeError: "The lesson could not be completed. Your response is still here; try again.",
    completed: "LESSON COMPLETED",
    completedBody: "This lesson is already recorded as completed in your progress.",
    resultTitle: "Progress recorded",
    xp: "XP earned",
    streak: "Streak",
    streakDays: "days",
    continue: "Continue to Passport",
    premium: "PREMIUM LESSON",
    premiumTitle: "This lesson requires KIVRYN Premium",
    premiumBody: "Your current progress is preserved. Unlock Premium to access this content.",
    openPremium: "View KIVRYN Premium",
  },
} as const;

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function contentText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export default function PassportLessonScreen() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const id = lessonId?.trim() ?? "";
  const missionDate = useMemo(localDateKey, []);
  const passport = usePassportHome(missionDate);
  const profile = passport.data?.profile ?? null;
  const lessons = usePassportLessons(profile?.trackId ?? "");
  const startLesson = useStartPassportLesson(id);
  const completeLesson = useCompletePassportLesson(id);
  const subscription = useSubscription();
  const [answer, setAnswer] = useState("");
  const startedLessonRef = useRef<string | null>(null);

  const lesson = (lessons.data ?? []).find((item) => item.id === id) ?? null;
  const premiumPending = Boolean(lesson?.premium && subscription.isPending);
  const locked = Boolean(
    lesson?.premium && !subscription.isPending && subscription.data?.entitlement !== "premium",
  );

  useEffect(() => {
    if (!lesson || lesson.status !== "not_started" || premiumPending || locked) return;
    if (startedLessonRef.current === lesson.id || startLesson.isPending) return;
    startedLessonRef.current = lesson.id;
    startLesson.mutate(undefined, {
      onError: () => {
        startedLessonRef.current = null;
      },
    });
  }, [lesson?.id, lesson?.status, locked, premiumPending, startLesson.isPending]);

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

  if (lessons.isPending) return <LoadingState title={text.loading} />;
  if (lessons.isError) {
    return (
      <ErrorState
        title={text.errorTitle}
        message={text.errorBody}
        actionLabel={text.retry}
        onAction={() => void lessons.refetch()}
      />
    );
  }

  if (!lesson) {
    return (
      <AppScreen scroll contentContainerStyle={styles.page}>
        <StandardHeader title={text.title} subtitle={text.subtitle} />
        <StateCard title={text.notFoundTitle} body={text.notFoundBody}>
          <PrimaryButton label={text.back} onPress={() => router.replace("/passport")} />
        </StateCard>
      </AppScreen>
    );
  }

  if (premiumPending) return <LoadingState title={text.loading} />;

  const explanation = contentText(lesson.content.explanation);
  const example = contentText(lesson.content.example);
  const exercise = contentText(lesson.content.exercise);
  const practicalTask = contentText(lesson.content.practicalTask);
  const hasContent = Boolean(explanation || example || exercise || practicalTask);
  const completed = lesson.status === "completed" || Boolean(completeLesson.data);
  const canComplete = answer.trim().length >= 3 && !completeLesson.isPending && !completed && !locked;

  async function handleComplete() {
    if (!canComplete) return;
    try {
      await completeLesson.mutateAsync();
    } catch {
      // Mutation state renders the failure while keeping the local response intact.
    }
  }

  return (
    <AppScreen scroll contentContainerStyle={styles.page}>
      <StandardHeader title={text.title} subtitle={text.subtitle} />

      <Pressable accessibilityRole="button" onPress={() => router.replace("/passport")} style={styles.backButton}>
        <Text style={styles.backText}>‹ {text.back}</Text>
      </Pressable>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{text.lesson}</Text>
        <Text style={styles.lessonTitle}>{lesson.title}</Text>
        {lesson.description ? <Text style={styles.lessonDescription}>{lesson.description}</Text> : null}
        <View style={styles.metaRow}>
          <Meta label={text.difficulty} value={lesson.difficulty} />
          <Meta label={text.duration} value={`${lesson.estimatedMinutes} ${text.minutes}`} />
          <Meta label={text.type} value={lesson.lessonType} />
        </View>
      </View>

      {locked ? (
        <View style={styles.premiumCard}>
          <Text style={styles.premiumEyebrow}>{text.premium}</Text>
          <Text style={styles.premiumTitle}>{text.premiumTitle}</Text>
          <Text style={styles.premiumBody}>{text.premiumBody}</Text>
          <PrimaryButton label={text.openPremium} onPress={() => router.push("/premium")} />
        </View>
      ) : (
        <>
          <View style={styles.contentStack}>
            {explanation ? <LessonBlock label={text.explanation} body={explanation} /> : null}
            {example ? <LessonBlock label={text.example} body={example} /> : null}
            {exercise ? <LessonBlock label={text.exercise} body={exercise} /> : null}
            {practicalTask ? <LessonBlock label={text.practicalTask} body={practicalTask} /> : null}
            {!hasContent ? (
              <View style={styles.contentCard}>
                <Text style={styles.contentBody}>{text.noContent}</Text>
              </View>
            ) : null}
          </View>

          {completed ? (
            <View style={styles.successCard} accessibilityLiveRegion="polite">
              <Text style={styles.successEyebrow}>{text.completed}</Text>
              <Text style={styles.successTitle}>{completeLesson.data ? text.resultTitle : lesson.title}</Text>
              {completeLesson.data ? (
                <View style={styles.resultRow}>
                  <ResultMetric label={text.xp} value={`+${completeLesson.data.xp}`} />
                  <ResultMetric
                    label={text.streak}
                    value={`${completeLesson.data.streak} ${text.streakDays}`}
                  />
                </View>
              ) : (
                <Text style={styles.successBody}>{text.completedBody}</Text>
              )}
              <PrimaryButton label={text.continue} onPress={() => router.replace("/passport")} />
            </View>
          ) : (
            <View style={styles.responseCard}>
              <Text style={styles.responseLabel}>{text.response}</Text>
              <TextInput
                value={answer}
                onChangeText={(value) => {
                  setAnswer(value);
                  completeLesson.reset();
                }}
                multiline
                maxLength={4000}
                placeholder={text.responsePlaceholder}
                placeholderTextColor={colors.textMuted}
                textAlignVertical="top"
                style={styles.input}
              />
              <Text style={styles.responseNote}>{text.responseNote}</Text>

              {completeLesson.isError ? (
                <View style={styles.errorCard} accessibilityLiveRegion="polite">
                  <Text style={styles.errorText}>{text.completeError}</Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canComplete }}
                disabled={!canComplete}
                onPress={() => void handleComplete()}
                style={({ pressed }) => [
                  styles.completeButton,
                  !canComplete && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.completeButtonText}>
                  {completeLesson.isPending ? text.completing : text.complete}
                </Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </AppScreen>
  );
}

function LessonBlock({ label, body }: { label: string; body: string }) {
  return (
    <View style={styles.contentCard}>
      <Text style={styles.contentLabel}>{label}</Text>
      <Text style={styles.contentBody}>{body}</Text>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaChip}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultMetric}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
    </View>
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
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  lessonTitle: { ...typography.title, color: colors.text, marginTop: spacing.sm },
  lessonDescription: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  metaChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvasElevated,
  },
  metaLabel: { ...typography.caption, color: colors.textMuted },
  metaValue: { ...typography.label, color: colors.text, marginTop: spacing.xs },
  contentStack: { gap: spacing.md, marginTop: spacing.md },
  contentCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  contentLabel: { ...typography.eyebrow, color: colors.primaryBright },
  contentBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  responseCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.canvasElevated,
  },
  responseLabel: { ...typography.eyebrow, color: colors.primaryBright },
  input: {
    minHeight: 140,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    ...typography.body,
    color: colors.text,
  },
  responseNote: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  errorCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  errorText: { ...typography.caption, color: colors.danger },
  completeButton: {
    minHeight: 54,
    marginTop: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  completeButtonText: { ...typography.label, color: colors.text },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
  successCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.canvasElevated,
  },
  successEyebrow: { ...typography.eyebrow, color: colors.success },
  successTitle: { ...typography.heading, color: colors.text, marginTop: spacing.sm },
  successBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  resultRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  resultMetric: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  resultLabel: { ...typography.caption, color: colors.textMuted },
  resultValue: { ...typography.heading, color: colors.primaryBright, marginTop: spacing.xs },
  premiumCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.canvasElevated,
  },
  premiumEyebrow: { ...typography.eyebrow, color: colors.warning },
  premiumTitle: { ...typography.heading, color: colors.text, marginTop: spacing.sm },
  premiumBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
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
});
