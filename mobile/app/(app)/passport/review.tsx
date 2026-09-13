import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { ErrorState, LoadingState } from "@/components/screen-state";
import {
  useAddPassportVocabulary,
  usePassportDueVocabulary,
  usePassportHome,
  useReviewPassportVocabulary,
} from "@/hooks/use-passport";
import type { PassportReviewResult, PassportVocabularyStage } from "@/lib/passport";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";

const copy = {
  "pt-BR": {
    title: "Revisão do Passport",
    subtitle: "Fortaleça o vocabulário com repetição espaçada baseada no seu desempenho.",
    loading: "Preparando sua revisão…",
    errorTitle: "Não foi possível carregar o vocabulário.",
    errorBody: "Seus dados não foram alterados. Verifique a conexão e tente novamente.",
    retry: "Tentar novamente",
    back: "Voltar ao Passport",
    noProfileTitle: "Configure seu Passport primeiro",
    noProfileBody: "A revisão precisa de um perfil Passport com idioma principal.",
    configure: "Configurar Passport",
    queue: "FILA DE REVISÃO",
    remaining: "pendentes agora",
    reviewed: "revisadas nesta sessão",
    stage: "Estágio",
    repetitions: "Repetições",
    reveal: "Mostrar resposta",
    translation: "TRADUÇÃO",
    context: "CONTEXTO",
    noTranslation: "Nenhuma tradução foi salva para este termo.",
    noContext: "Nenhum contexto foi salvo para este termo.",
    ratePrompt: "Como foi lembrar desta palavra?",
    forgot: "Não lembrei",
    forgotHint: "Rever cedo",
    hard: "Difícil",
    hardHint: "Lembrei com esforço",
    good: "Bom",
    goodHint: "Lembrei bem",
    easy: "Fácil",
    easyHint: "Lembrei imediatamente",
    savingReview: "Salvando revisão…",
    reviewError: "Não foi possível registrar esta revisão. Tente novamente.",
    scheduled: "REVISÃO REGISTRADA",
    scheduledTitle: "Próxima revisão agendada",
    interval: "Novo intervalo",
    days: "dias",
    nextReview: "Próxima revisão",
    newStage: "Novo estágio",
    nextWord: "Próxima palavra",
    finish: "Finalizar revisão",
    allClearTitle: "Revisão em dia",
    allClearBody: "Não há palavras vencidas para revisar agora. Novas revisões aparecerão quando chegarem à data programada.",
    addVocabulary: "+ Adicionar vocabulário",
    closeAdd: "Fechar cadastro",
    addTitle: "Adicionar ao Passport",
    addBody: "Salve um termo real para ele entrar imediatamente na fila de repetição espaçada.",
    term: "Termo",
    termPlaceholder: "Ex.: boarding pass",
    translationField: "Tradução",
    translationPlaceholder: "Ex.: cartão de embarque",
    contextField: "Contexto",
    contextPlaceholder: "Ex.: Could I see your boarding pass?",
    saveWord: "Salvar palavra",
    savingWord: "Salvando…",
    addError: "Não foi possível salvar este termo. Verifique os dados e tente novamente.",
    addHint: "O termo é obrigatório. Tradução e contexto são opcionais.",
    newStageLabel: "Novo",
    learningStageLabel: "Aprendendo",
    reviewStageLabel: "Revisão",
    masteredStageLabel: "Dominado",
  },
  en: {
    title: "Passport review",
    subtitle: "Strengthen vocabulary with spaced repetition based on your performance.",
    loading: "Preparing your review…",
    errorTitle: "Vocabulary could not be loaded.",
    errorBody: "Your data was not changed. Check the connection and try again.",
    retry: "Try again",
    back: "Back to Passport",
    noProfileTitle: "Set up your Passport first",
    noProfileBody: "Review needs a Passport profile with a primary language.",
    configure: "Set up Passport",
    queue: "REVIEW QUEUE",
    remaining: "due now",
    reviewed: "reviewed this session",
    stage: "Stage",
    repetitions: "Repetitions",
    reveal: "Show answer",
    translation: "TRANSLATION",
    context: "CONTEXT",
    noTranslation: "No translation was saved for this term.",
    noContext: "No context was saved for this term.",
    ratePrompt: "How well did you remember this word?",
    forgot: "Forgot",
    forgotHint: "Review soon",
    hard: "Hard",
    hardHint: "Remembered with effort",
    good: "Good",
    goodHint: "Remembered well",
    easy: "Easy",
    easyHint: "Remembered immediately",
    savingReview: "Saving review…",
    reviewError: "This review could not be recorded. Try again.",
    scheduled: "REVIEW RECORDED",
    scheduledTitle: "Next review scheduled",
    interval: "New interval",
    days: "days",
    nextReview: "Next review",
    newStage: "New stage",
    nextWord: "Next word",
    finish: "Finish review",
    allClearTitle: "Review is up to date",
    allClearBody: "There are no due words to review right now. New reviews will appear when their scheduled date arrives.",
    addVocabulary: "+ Add vocabulary",
    closeAdd: "Close form",
    addTitle: "Add to Passport",
    addBody: "Save a real term so it immediately enters your spaced-repetition queue.",
    term: "Term",
    termPlaceholder: "E.g. boarding pass",
    translationField: "Translation",
    translationPlaceholder: "E.g. cartão de embarque",
    contextField: "Context",
    contextPlaceholder: "E.g. Could I see your boarding pass?",
    saveWord: "Save word",
    savingWord: "Saving…",
    addError: "This term could not be saved. Check the data and try again.",
    addHint: "Term is required. Translation and context are optional.",
    newStageLabel: "New",
    learningStageLabel: "Learning",
    reviewStageLabel: "Review",
    masteredStageLabel: "Mastered",
  },
} as const;

const ratings = [
  { grade: 1, labelKey: "forgot", hintKey: "forgotHint" },
  { grade: 3, labelKey: "hard", hintKey: "hardHint" },
  { grade: 4, labelKey: "good", hintKey: "goodHint" },
  { grade: 5, labelKey: "easy", hintKey: "easyHint" },
] as const;

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatReviewDate(value: string, locale: "pt-BR" | "en") {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString(locale === "en" ? "en-US" : "pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PassportReviewScreen() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const missionDate = useMemo(localDateKey, []);
  const passport = usePassportHome(missionDate);
  const profile = passport.data?.profile ?? null;
  const due = usePassportDueVocabulary(profile?.trackId ?? "", 20);
  const review = useReviewPassportVocabulary();
  const addVocabulary = useAddPassportVocabulary(profile?.trackId ?? "");

  const [revealed, setRevealed] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [lastResult, setLastResult] = useState<PassportReviewResult | null>(null);
  const [reviewedTerm, setReviewedTerm] = useState("");
  const [adding, setAdding] = useState(false);
  const [term, setTerm] = useState("");
  const [translation, setTranslation] = useState("");
  const [context, setContext] = useState("");

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

  if (due.isPending) return <LoadingState title={text.loading} />;
  if (due.isError) {
    return (
      <ErrorState
        title={text.errorTitle}
        message={text.errorBody}
        actionLabel={text.retry}
        onAction={() => void due.refetch()}
      />
    );
  }

  const queue = due.data ?? [];
  const current = queue[0] ?? null;

  async function handleGrade(grade: number) {
    if (!current || review.isPending) return;
    try {
      const result = await review.mutateAsync({ vocabularyId: current.id, grade });
      setReviewedTerm(current.term);
      setLastResult(result);
      setReviewedCount((value) => value + 1);
      setRevealed(false);
    } catch {
      // Mutation state displays the error without removing the current card.
    }
  }

  async function handleAddVocabulary() {
    const cleanTerm = term.trim();
    if (!cleanTerm || addVocabulary.isPending) return;
    try {
      await addVocabulary.mutateAsync({
        term: cleanTerm,
        translation: translation.trim(),
        context: context.trim(),
      });
      setTerm("");
      setTranslation("");
      setContext("");
      setAdding(false);
      setLastResult(null);
    } catch {
      // Mutation state keeps the draft visible for retry.
    }
  }

  function continueAfterResult() {
    setLastResult(null);
    setReviewedTerm("");
    review.reset();
  }

  return (
    <AppScreen scroll contentContainerStyle={styles.page}>
      <StandardHeader title={text.title} subtitle={text.subtitle} />

      <View style={styles.topRow}>
        <Pressable accessibilityRole="button" onPress={() => router.replace("/passport")} style={styles.backButton}>
          <Text style={styles.backText}>‹ {text.back}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setAdding((value) => !value);
            addVocabulary.reset();
          }}
          style={({ pressed }) => [styles.addToggle, pressed && styles.pressed]}
        >
          <Text style={styles.addToggleText}>{adding ? text.closeAdd : text.addVocabulary}</Text>
        </Pressable>
      </View>

      {adding ? (
        <View style={styles.addCard}>
          <Text style={styles.addTitle}>{text.addTitle}</Text>
          <Text style={styles.addBody}>{text.addBody}</Text>
          <Field label={text.term}>
            <TextInput
              value={term}
              onChangeText={(value) => {
                setTerm(value);
                addVocabulary.reset();
              }}
              maxLength={160}
              autoCapitalize="none"
              placeholder={text.termPlaceholder}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </Field>
          <Field label={text.translationField}>
            <TextInput
              value={translation}
              onChangeText={(value) => {
                setTranslation(value);
                addVocabulary.reset();
              }}
              maxLength={500}
              placeholder={text.translationPlaceholder}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </Field>
          <Field label={text.contextField}>
            <TextInput
              value={context}
              onChangeText={(value) => {
                setContext(value);
                addVocabulary.reset();
              }}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              placeholder={text.contextPlaceholder}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.contextInput]}
            />
          </Field>
          <Text style={styles.hint}>{text.addHint}</Text>
          {addVocabulary.isError ? (
            <View style={styles.errorCard} accessibilityLiveRegion="polite">
              <Text style={styles.errorText}>{text.addError}</Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !term.trim() || addVocabulary.isPending }}
            disabled={!term.trim() || addVocabulary.isPending}
            onPress={() => void handleAddVocabulary()}
            style={({ pressed }) => [
              styles.primaryAction,
              (!term.trim() || addVocabulary.isPending) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryActionText}>
              {addVocabulary.isPending ? text.savingWord : text.saveWord}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.metricsRow}>
        <Metric label={text.remaining} value={String(queue.length)} />
        <Metric label={text.reviewed} value={String(reviewedCount)} />
      </View>

      {lastResult ? (
        <View style={styles.resultCard} accessibilityLiveRegion="polite">
          <Text style={styles.resultEyebrow}>{text.scheduled}</Text>
          <Text style={styles.resultTitle}>{reviewedTerm}</Text>
          <Text style={styles.resultBody}>{text.scheduledTitle}</Text>
          <View style={styles.resultMetrics}>
            <Metric label={text.interval} value={`${lastResult.intervalDays} ${text.days}`} />
            <Metric label={text.newStage} value={stageLabel(lastResult.stage, text)} />
          </View>
          <View style={styles.nextReviewCard}>
            <Text style={styles.nextReviewLabel}>{text.nextReview}</Text>
            <Text style={styles.nextReviewValue}>
              {formatReviewDate(lastResult.nextReviewAt, resolvedLocale)}
            </Text>
          </View>
          <PrimaryButton
            label={queue.length > 0 ? text.nextWord : text.finish}
            onPress={queue.length > 0 ? continueAfterResult : () => router.replace("/passport")}
          />
        </View>
      ) : current ? (
        <View style={styles.reviewCard}>
          <View style={styles.queueHeader}>
            <Text style={styles.queueEyebrow}>{text.queue}</Text>
            <Text style={styles.queueCount}>{queue.length}</Text>
          </View>

          <Text style={styles.term}>{current.term}</Text>
          <View style={styles.metaRow}>
            <Meta label={text.stage} value={stageLabel(current.stage, text)} />
            <Meta label={text.repetitions} value={String(current.repetitions)} />
          </View>

          {!revealed ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setRevealed(true);
                review.reset();
              }}
              style={({ pressed }) => [styles.revealButton, pressed && styles.pressed]}
            >
              <Text style={styles.revealText}>{text.reveal}</Text>
            </Pressable>
          ) : (
            <>
              <View style={styles.answerCard}>
                <Text style={styles.answerLabel}>{text.translation}</Text>
                <Text style={styles.answerText}>{current.translation || text.noTranslation}</Text>
                <Text style={[styles.answerLabel, styles.contextLabel]}>{text.context}</Text>
                <Text style={styles.contextText}>{current.context || text.noContext}</Text>
              </View>

              <Text style={styles.ratePrompt}>{text.ratePrompt}</Text>
              <View style={styles.ratingGrid}>
                {ratings.map((rating) => (
                  <Pressable
                    key={rating.grade}
                    accessibilityRole="button"
                    disabled={review.isPending}
                    onPress={() => void handleGrade(rating.grade)}
                    style={({ pressed }) => [
                      styles.ratingButton,
                      review.isPending && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.ratingLabel}>{text[rating.labelKey]}</Text>
                    <Text style={styles.ratingHint}>{text[rating.hintKey]}</Text>
                  </Pressable>
                ))}
              </View>

              {review.isPending ? <Text style={styles.savingText}>{text.savingReview}</Text> : null}
              {review.isError ? (
                <View style={styles.errorCard} accessibilityLiveRegion="polite">
                  <Text style={styles.errorText}>{text.reviewError}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : (
        <StateCard title={text.allClearTitle} body={text.allClearBody}>
          <PrimaryButton label={text.back} onPress={() => router.replace("/passport")} />
        </StateCard>
      )}
    </AppScreen>
  );
}

function stageLabel(
  stage: PassportVocabularyStage,
  text: (typeof copy)["pt-BR"] | (typeof copy)["en"],
) {
  if (stage === "new") return text.newStageLabel;
  if (stage === "learning") return text.learningStageLabel;
  if (stage === "review") return text.reviewStageLabel;
  return text.masteredStageLabel;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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

function StateCard({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
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
      style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
    >
      <Text style={styles.primaryActionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: spacing.xl },
  topRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  backButton: { paddingVertical: spacing.sm },
  backText: { ...typography.label, color: colors.textSecondary },
  addToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.canvasElevated,
  },
  addToggleText: { ...typography.caption, color: colors.primaryBright },
  addCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.surface,
  },
  addTitle: { ...typography.heading, color: colors.text },
  addBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  field: { marginTop: spacing.md },
  fieldLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },
  input: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    ...typography.body,
    color: colors.text,
  },
  contextInput: { minHeight: 96 },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  metricsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  metric: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  metricLabel: { ...typography.caption, color: colors.textMuted },
  metricValue: { ...typography.heading, color: colors.text, marginTop: spacing.xs },
  reviewCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.surface,
  },
  queueHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  queueEyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  queueCount: { ...typography.label, color: colors.textMuted },
  term: { ...typography.title, color: colors.text, marginTop: spacing.xl, textAlign: "center" },
  metaRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  metaChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvasElevated,
  },
  metaLabel: { ...typography.caption, color: colors.textMuted },
  metaValue: { ...typography.label, color: colors.text, marginTop: spacing.xs },
  revealButton: {
    minHeight: 54,
    marginTop: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  revealText: { ...typography.label, color: colors.text },
  answerCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvasElevated,
  },
  answerLabel: { ...typography.eyebrow, color: colors.primaryBright },
  answerText: { ...typography.heading, color: colors.text, marginTop: spacing.sm },
  contextLabel: { marginTop: spacing.lg },
  contextText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  ratePrompt: { ...typography.heading, color: colors.text, marginTop: spacing.xl },
  ratingGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  ratingButton: {
    width: "48%",
    minHeight: 78,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.canvasElevated,
    justifyContent: "center",
  },
  ratingLabel: { ...typography.label, color: colors.text },
  ratingHint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  savingText: { ...typography.caption, color: colors.primaryBright, marginTop: spacing.md },
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
  resultBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  resultMetrics: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  nextReviewCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  nextReviewLabel: { ...typography.caption, color: colors.textMuted },
  nextReviewValue: { ...typography.heading, color: colors.primaryBright, marginTop: spacing.xs },
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
  primaryAction: {
    minHeight: 52,
    marginTop: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  primaryActionText: { ...typography.label, color: colors.text },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
});
