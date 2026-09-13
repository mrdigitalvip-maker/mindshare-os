import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { ErrorState, LoadingState } from "@/components/screen-state";
import {
  usePassportHome,
  usePassportPlacementQuestions,
  useSubmitPassportPlacement,
} from "@/hooks/use-passport";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";

const copy = {
  "pt-BR": {
    title: "Teste de nível",
    subtitle: "Calibre seu Passport com perguntas reais do idioma escolhido.",
    system: "PLACEMENT ENGINE",
    noProfileTitle: "Configure seu Passport primeiro",
    noProfileBody: "O teste de nível precisa de um idioma principal antes de começar.",
    configure: "Configurar Passport",
    loading: "Carregando teste de nível…",
    errorTitle: "Não foi possível carregar o teste.",
    errorBody: "Nenhuma resposta foi enviada. Verifique a conexão e tente novamente.",
    retry: "Tentar novamente",
    emptyTitle: "Nenhuma pergunta disponível",
    emptyBody: "Este idioma ainda não tem perguntas de nivelamento disponíveis.",
    question: "PERGUNTA",
    difficulty: "DIFICULDADE",
    answered: "respondidas",
    previous: "Anterior",
    next: "Próxima",
    completeTitle: "Respostas completas",
    completeBody: "Revise suas escolhas. O resultado será calculado pelo servidor quando você enviar o teste.",
    submit: "Enviar teste",
    submitting: "Calculando nível…",
    submitError: "Não foi possível calcular seu nível. Suas respostas continuam aqui; tente novamente.",
    resultEyebrow: "NÍVEL DEFINIDO",
    resultTitle: "Seu resultado do Passport",
    resultLevel: "Nível",
    resultScore: "Score",
    resultBody: "O resultado foi calculado pelo servidor e aplicado ao seu perfil Passport.",
    continue: "Continuar para o Passport",
  },
  en: {
    title: "Placement test",
    subtitle: "Calibrate your Passport with real questions from your selected language.",
    system: "PLACEMENT ENGINE",
    noProfileTitle: "Set up your Passport first",
    noProfileBody: "The placement test needs a primary language before it can begin.",
    configure: "Set up Passport",
    loading: "Loading placement test…",
    errorTitle: "The placement test could not be loaded.",
    errorBody: "No answers were submitted. Check your connection and try again.",
    retry: "Try again",
    emptyTitle: "No questions available",
    emptyBody: "This language does not have placement questions available yet.",
    question: "QUESTION",
    difficulty: "DIFFICULTY",
    answered: "answered",
    previous: "Previous",
    next: "Next",
    completeTitle: "Answers complete",
    completeBody: "Review your choices. Your result will be calculated by the server when you submit the test.",
    submit: "Submit test",
    submitting: "Calculating level…",
    submitError: "Your level could not be calculated. Your answers are still here; try again.",
    resultEyebrow: "LEVEL SET",
    resultTitle: "Your Passport result",
    resultLevel: "Level",
    resultScore: "Score",
    resultBody: "The result was calculated by the server and applied to your Passport profile.",
    continue: "Continue to Passport",
  },
} as const;

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function PassportPlacement() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const missionDate = useMemo(localDateKey, []);
  const passport = usePassportHome(missionDate);
  const profile = passport.data?.profile ?? null;
  const questionsQuery = usePassportPlacementQuestions(profile?.trackId ?? "");
  const submitPlacement = useSubmitPassportPlacement(profile?.trackId ?? "");
  const questions = useMemo(
    () => [...(questionsQuery.data ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [questionsQuery.data],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

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
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>{text.noProfileTitle}</Text>
          <Text style={styles.stateBody}>{text.noProfileBody}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/passport/setup")}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>{text.configure}</Text>
          </Pressable>
        </View>
      </AppScreen>
    );
  }

  if (questionsQuery.isPending) return <LoadingState title={text.loading} />;
  if (questionsQuery.isError) {
    return (
      <ErrorState
        title={text.errorTitle}
        message={text.errorBody}
        actionLabel={text.retry}
        onAction={() => void questionsQuery.refetch()}
      />
    );
  }

  if (!questions.length) {
    return (
      <AppScreen scroll contentContainerStyle={styles.page}>
        <StandardHeader title={text.title} subtitle={text.subtitle} />
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>{text.emptyTitle}</Text>
          <Text style={styles.stateBody}>{text.emptyBody}</Text>
        </View>
      </AppScreen>
    );
  }

  const safeIndex = Math.min(currentIndex, questions.length - 1);
  const question = questions[safeIndex];
  const selectedOption = answers[question.key];
  const answeredCount = questions.reduce(
    (count, item) => count + (answers[item.key] !== undefined ? 1 : 0),
    0,
  );
  const allAnswered = answeredCount === questions.length;
  const hasResult = Boolean(submitPlacement.data);
  const interactionLocked = submitPlacement.isPending || hasResult;
  const canGoNext = selectedOption !== undefined && safeIndex < questions.length - 1 && !interactionLocked;

  async function submitAnswers() {
    if (!profile || !allAnswered || submitPlacement.isPending || hasResult) return;
    try {
      await submitPlacement.mutateAsync(answers);
    } catch {
      // Mutation state exposes the user-facing error below without clearing answers.
    }
  }

  return (
    <AppScreen scroll contentContainerStyle={styles.page}>
      <StandardHeader title={text.title} subtitle={text.subtitle} />

      <View style={styles.statusCard}>
        <View style={styles.statusTopRow}>
          <Text style={styles.eyebrow}>{text.system}</Text>
          <Text style={styles.counter}>
            {safeIndex + 1}/{questions.length}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(8, ((safeIndex + 1) / questions.length) * 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressMeta}>
          {answeredCount}/{questions.length} {text.answered}
        </Text>
      </View>

      <View style={styles.questionCard}>
        <View style={styles.questionMeta}>
          <Text style={styles.questionLabel}>{text.question} {safeIndex + 1}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{text.difficulty} {question.difficulty}</Text>
          </View>
        </View>

        <Text style={styles.prompt}>{question.prompt}</Text>

        <View style={styles.options}>
          {question.options.map((option, index) => {
            const selected = selectedOption === index;
            return (
              <Pressable
                key={`${question.key}-${index}`}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: interactionLocked }}
                disabled={interactionLocked}
                onPress={() => {
                  submitPlacement.reset();
                  setAnswers((current) => ({
                    ...current,
                    [question.key]: index,
                  }));
                }}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.optionSelected,
                  interactionLocked && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.optionIndex, selected && styles.optionIndexSelected]}>
                  <Text style={[styles.optionIndexText, selected && styles.optionIndexTextSelected]}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {!hasResult ? (
        <View style={styles.navigationRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: safeIndex === 0 || submitPlacement.isPending }}
            disabled={safeIndex === 0 || submitPlacement.isPending}
            onPress={() => setCurrentIndex((value) => Math.max(0, value - 1))}
            style={({ pressed }) => [
              styles.secondaryButton,
              (safeIndex === 0 || submitPlacement.isPending) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>{text.previous}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canGoNext }}
            disabled={!canGoNext}
            onPress={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))}
            style={({ pressed }) => [
              styles.primaryButton,
              !canGoNext && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>{text.next}</Text>
          </Pressable>
        </View>
      ) : null}

      {allAnswered && !hasResult ? (
        <View style={styles.completeCard} accessibilityLiveRegion="polite">
          <Text style={styles.completeTitle}>{text.completeTitle}</Text>
          <Text style={styles.completeBody}>{text.completeBody}</Text>

          {submitPlacement.isError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{text.submitError}</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: submitPlacement.isPending }}
            disabled={submitPlacement.isPending}
            onPress={() => void submitAnswers()}
            style={({ pressed }) => [
              styles.submitButton,
              submitPlacement.isPending && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.submitButtonText}>
              {submitPlacement.isPending ? text.submitting : text.submit}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {submitPlacement.data ? (
        <View style={styles.resultCard} accessibilityLiveRegion="polite">
          <Text style={styles.resultEyebrow}>{text.resultEyebrow}</Text>
          <Text style={styles.resultTitle}>{text.resultTitle}</Text>
          <View style={styles.resultMetrics}>
            <View style={styles.resultMetric}>
              <Text style={styles.resultMetricLabel}>{text.resultLevel}</Text>
              <Text style={styles.resultMetricValue}>{submitPlacement.data.level}</Text>
            </View>
            <View style={styles.resultMetric}>
              <Text style={styles.resultMetricLabel}>{text.resultScore}</Text>
              <Text style={styles.resultMetricValue}>{String(submitPlacement.data.score)}</Text>
            </View>
          </View>
          <Text style={styles.resultBody}>{text.resultBody}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/passport")}
            style={({ pressed }) => [styles.primaryButton, styles.continueButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>{text.continue}</Text>
          </Pressable>
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: spacing.xl },
  statusCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvasElevated,
  },
  statusTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  counter: { ...typography.label, color: colors.text },
  progressTrack: {
    height: 5,
    marginTop: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.primaryBright },
  progressMeta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  questionCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  questionMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  questionLabel: { ...typography.eyebrow, color: colors.primaryBright },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.surfaceRaised,
  },
  levelText: { ...typography.caption, color: colors.textSecondary },
  prompt: { ...typography.title, color: colors.text, marginTop: spacing.lg },
  options: { marginTop: spacing.lg, gap: spacing.sm },
  option: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvasElevated,
  },
  optionSelected: { borderColor: colors.primaryBright, backgroundColor: colors.surfaceRaised },
  optionIndex: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderActive,
  },
  optionIndexSelected: { borderColor: colors.primaryBright, backgroundColor: colors.primaryBright },
  optionIndexText: { ...typography.label, color: colors.textSecondary },
  optionIndexTextSelected: { color: colors.background },
  optionText: { ...typography.body, flex: 1, color: colors.textSecondary },
  optionTextSelected: { color: colors.text },
  navigationRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: { ...typography.label, color: colors.textSecondary },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  primaryButtonText: { ...typography.label, color: colors.text },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.82 },
  completeCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.canvasElevated,
  },
  completeTitle: { ...typography.heading, color: colors.primaryBright },
  completeBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  submitButton: {
    minHeight: 52,
    marginTop: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  submitButtonText: { ...typography.label, color: colors.text },
  errorCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  errorText: { ...typography.caption, color: colors.danger },
  resultCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.canvasElevated,
  },
  resultEyebrow: { ...typography.eyebrow, color: colors.success },
  resultTitle: { ...typography.title, color: colors.text, marginTop: spacing.sm },
  resultMetrics: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  resultMetric: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  resultMetricLabel: { ...typography.caption, color: colors.textMuted },
  resultMetricValue: { ...typography.title, color: colors.primaryBright, marginTop: spacing.xs },
  resultBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
  continueButton: { marginTop: spacing.lg },
  stateCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stateTitle: { ...typography.heading, color: colors.text },
  stateBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.lg },
});
