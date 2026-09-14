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
import { isPremiumEntitlement } from "@/lib/subscription";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";

const P = {
  canvas: "#050913",
  panel: "#0A1220",
  panelAlt: "#0E1526",
  cyan: "#52E5FF",
  blue: "#6C7CFF",
  purple: "#B678FF",
  mint: "#5CF0B1",
  gold: "#FFC96B",
  coral: "#FF7F86",
  text: "#F4F8FF",
  muted: "#92A2B9",
  border: "#1D2C43",
};

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
    explanation: "ENTENDA",
    example: "VEJA EM AÇÃO",
    exercise: "PRATIQUE",
    practicalTask: "LEVE PARA O MUNDO REAL",
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
    guide: "NOVA · GUIA DA AULA",
    guideBody: "Siga as etapas abaixo. Eu deixei a aula organizada para você entender, ver um exemplo, praticar e aplicar.",
    route: "ROTA DA AULA",
    stepUnderstand: "Entender",
    stepExample: "Exemplo",
    stepPractice: "Praticar",
    stepApply: "Aplicar",
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
    explanation: "UNDERSTAND",
    example: "SEE IT IN ACTION",
    exercise: "PRACTICE",
    practicalTask: "TAKE IT TO THE REAL WORLD",
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
    guide: "NOVA · LESSON GUIDE",
    guideBody: "Follow the steps below. I organized the lesson so you can understand, see an example, practice and apply it.",
    route: "LESSON ROUTE",
    stepUnderstand: "Understand",
    stepExample: "Example",
    stepPractice: "Practice",
    stepApply: "Apply",
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
    lesson?.premium &&
      !subscription.isPending &&
      !isPremiumEntitlement(subscription.data?.entitlement ?? "free"),
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
      <Pressable accessibilityRole="button" onPress={() => router.replace("/passport")} style={styles.backButton}>
        <Text style={styles.backText}>‹ {text.back}</Text>
      </Pressable>

      <View style={styles.hero}>
        <View pointerEvents="none" style={styles.heroGlowOne} />
        <View pointerEvents="none" style={styles.heroGlowTwo} />
        <View style={styles.lessonBadge}>
          <Text style={styles.lessonBadgeText}>K</Text>
        </View>
        <Text style={styles.eyebrow}>{text.lesson}</Text>
        <Text style={styles.lessonTitle}>{lesson.title}</Text>
        {lesson.description ? <Text style={styles.lessonDescription}>{lesson.description}</Text> : null}
        <View style={styles.metaRow}>
          <Meta tone={P.cyan} label={text.difficulty} value={lesson.difficulty} />
          <Meta tone={P.purple} label={text.duration} value={`${lesson.estimatedMinutes} ${text.minutes}`} />
          <Meta tone={P.gold} label={text.type} value={lesson.lessonType} />
        </View>
      </View>

      <NovaGuide label={text.guide} body={text.guideBody} />

      <View style={styles.routeCard}>
        <Text style={styles.routeLabel}>{text.route}</Text>
        <View style={styles.routeRow}>
          <RouteStep index="1" tone={P.cyan} label={text.stepUnderstand} />
          <RouteStep index="2" tone={P.purple} label={text.stepExample} />
          <RouteStep index="3" tone={P.gold} label={text.stepPractice} />
          <RouteStep index="4" tone={P.mint} label={text.stepApply} />
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
            {explanation ? <LessonBlock symbol="01" tone={P.cyan} label={text.explanation} body={explanation} /> : null}
            {example ? <LessonBlock symbol="02" tone={P.purple} label={text.example} body={example} /> : null}
            {exercise ? <LessonBlock symbol="03" tone={P.gold} label={text.exercise} body={exercise} /> : null}
            {practicalTask ? <LessonBlock symbol="04" tone={P.mint} label={text.practicalTask} body={practicalTask} /> : null}
            {!hasContent ? (
              <View style={styles.contentCard}>
                <Text style={styles.contentBody}>{text.noContent}</Text>
              </View>
            ) : null}
          </View>

          {completed ? (
            <View style={styles.successCard} accessibilityLiveRegion="polite">
              <View style={styles.successOrb}><Text style={styles.successOrbText}>✓</Text></View>
              <Text style={styles.successEyebrow}>{text.completed}</Text>
              <Text style={styles.successTitle}>{completeLesson.data ? text.resultTitle : lesson.title}</Text>
              {completeLesson.data ? (
                <View style={styles.resultRow}>
                  <ResultMetric label={text.xp} value={`+${completeLesson.data.xp}`} />
                  <ResultMetric label={text.streak} value={`${completeLesson.data.streak} ${text.streakDays}`} />
                </View>
              ) : (
                <Text style={styles.successBody}>{text.completedBody}</Text>
              )}
              <PrimaryButton label={text.continue} onPress={() => router.replace("/passport")} />
            </View>
          ) : (
            <View style={styles.responseCard}>
              <View style={styles.responseHeader}>
                <View style={styles.responseIcon}><Text style={styles.responseIconText}>✦</Text></View>
                <Text style={styles.responseLabel}>{text.response}</Text>
              </View>
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
                style={({ pressed }) => [styles.completeButton, !canComplete && styles.disabled, pressed && styles.pressed]}
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

function NovaGuide({ label, body }: { label: string; body: string }) {
  return (
    <View style={styles.guideCard}>
      <View style={styles.robotWrap}>
        <View style={styles.antenna} />
        <View style={styles.robotHead}>
          <View style={styles.robotEyeRow}><View style={styles.robotEye} /><View style={styles.robotEye} /></View>
          <View style={styles.robotMouth} />
        </View>
        <View style={styles.robotBody}><View style={styles.robotCore} /></View>
      </View>
      <View style={styles.guideCopy}>
        <Text style={styles.guideLabel}>{label}</Text>
        <Text style={styles.guideBody}>{body}</Text>
      </View>
    </View>
  );
}

function RouteStep({ index, tone, label }: { index: string; tone: string; label: string }) {
  return (
    <View style={styles.routeStep}>
      <View style={[styles.routeDot, { borderColor: tone, backgroundColor: `${tone}22` }]}>
        <Text style={[styles.routeDotText, { color: tone }]}>{index}</Text>
      </View>
      <Text numberOfLines={1} style={styles.routeStepLabel}>{label}</Text>
    </View>
  );
}

function LessonBlock({ symbol, tone, label, body }: { symbol: string; tone: string; label: string; body: string }) {
  return (
    <View style={[styles.contentCard, { borderColor: `${tone}55` }]}>
      <View pointerEvents="none" style={[styles.contentGlow, { backgroundColor: `${tone}14` }]} />
      <View style={styles.contentHeader}>
        <View style={[styles.contentSymbol, { backgroundColor: `${tone}1F`, borderColor: `${tone}66` }]}>
          <Text style={[styles.contentSymbolText, { color: tone }]}>{symbol}</Text>
        </View>
        <Text style={[styles.contentLabel, { color: tone }]}>{label}</Text>
      </View>
      <Text style={styles.contentBody}>{body}</Text>
    </View>
  );
}

function Meta({ tone, label, value }: { tone: string; label: string; value: string }) {
  return (
    <View style={[styles.metaChip, { borderColor: `${tone}55` }]}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, { color: tone }]}>{value}</Text>
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
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: spacing.xl, backgroundColor: P.canvas },
  backButton: { alignSelf: "flex-start", paddingVertical: spacing.sm },
  backText: { ...typography.label, color: "#B1C1D7" },
  hero: {
    overflow: "hidden",
    marginTop: spacing.xs,
    padding: spacing.lg,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#244B67",
    backgroundColor: "#08172A",
  },
  heroGlowOne: { position: "absolute", width: 220, height: 220, borderRadius: 220, right: -80, top: -100, backgroundColor: "#17498B", opacity: 0.33 },
  heroGlowTwo: { position: "absolute", width: 170, height: 170, borderRadius: 170, left: -90, bottom: -110, backgroundColor: "#6534A6", opacity: 0.23 },
  lessonBadge: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: P.cyan, backgroundColor: "#091829", marginBottom: spacing.md },
  lessonBadgeText: { color: P.cyan, fontSize: 21, fontWeight: "900" },
  eyebrow: { ...typography.eyebrow, color: P.cyan },
  lessonTitle: { ...typography.title, color: P.text, marginTop: spacing.sm },
  lessonDescription: { ...typography.body, color: "#B4C2D6", marginTop: spacing.sm },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  metaChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 16, borderWidth: 1, backgroundColor: "#07101D99" },
  metaLabel: { ...typography.caption, color: P.muted },
  metaValue: { ...typography.label, marginTop: spacing.xs },
  guideCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md, padding: spacing.md, borderRadius: 24, backgroundColor: "#17122E", borderWidth: 1, borderColor: "#513C7A" },
  robotWrap: { width: 68, height: 80, alignItems: "center", justifyContent: "flex-end" },
  antenna: { width: 3, height: 11, backgroundColor: P.purple, borderRadius: 3, marginBottom: -1 },
  robotHead: { width: 54, height: 41, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#211A3E", borderWidth: 1, borderColor: P.purple },
  robotEyeRow: { flexDirection: "row", gap: 12 },
  robotEye: { width: 7, height: 7, borderRadius: 7, backgroundColor: P.cyan },
  robotMouth: { width: 18, height: 3, borderRadius: 3, backgroundColor: "#7E6AAF", marginTop: 7 },
  robotBody: { width: 42, height: 25, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, alignItems: "center", paddingTop: 5, backgroundColor: "#17132D", borderWidth: 1, borderTopWidth: 0, borderColor: "#513C7A" },
  robotCore: { width: 8, height: 8, borderRadius: 8, backgroundColor: P.mint },
  guideCopy: { flex: 1 },
  guideLabel: { ...typography.eyebrow, color: P.purple },
  guideBody: { ...typography.body, color: P.text, marginTop: spacing.xs },
  routeCard: { marginTop: spacing.md, padding: spacing.md, borderRadius: 22, borderWidth: 1, borderColor: P.border, backgroundColor: P.panel },
  routeLabel: { ...typography.eyebrow, color: P.muted },
  routeRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.md },
  routeStep: { flex: 1, alignItems: "center" },
  routeDot: { width: 34, height: 34, borderRadius: 34, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  routeDotText: { fontSize: 12, fontWeight: "900" },
  routeStepLabel: { ...typography.caption, color: P.muted, marginTop: 6, fontSize: 10 },
  contentStack: { gap: spacing.md, marginTop: spacing.md },
  contentCard: { overflow: "hidden", padding: spacing.lg, borderRadius: 26, borderWidth: 1, backgroundColor: P.panel },
  contentGlow: { position: "absolute", width: 170, height: 170, borderRadius: 170, right: -85, top: -100 },
  contentHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  contentSymbol: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  contentSymbolText: { fontSize: 11, fontWeight: "900" },
  contentLabel: { ...typography.eyebrow, flex: 1 },
  contentBody: { ...typography.body, color: "#C0CCDA", marginTop: spacing.md, lineHeight: 24 },
  responseCard: { marginTop: spacing.md, padding: spacing.lg, borderRadius: 26, borderWidth: 1, borderColor: "#27637A", backgroundColor: "#081522" },
  responseHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  responseIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#123347" },
  responseIconText: { color: P.cyan, fontSize: 18 },
  responseLabel: { ...typography.eyebrow, color: P.cyan },
  input: { minHeight: 140, marginTop: spacing.md, padding: spacing.md, borderRadius: 18, borderWidth: 1, borderColor: "#264058", backgroundColor: "#040A12", ...typography.body, color: P.text },
  responseNote: { ...typography.caption, color: P.muted, marginTop: spacing.sm },
  errorCard: { marginTop: spacing.md, padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: P.coral, backgroundColor: "#261014" },
  errorText: { ...typography.caption, color: P.coral },
  completeButton: { minHeight: 54, marginTop: spacing.md, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: P.cyan },
  completeButtonText: { ...typography.label, color: "#041014", fontWeight: "900" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  successCard: { marginTop: spacing.md, padding: spacing.lg, borderRadius: 26, borderWidth: 1, borderColor: P.mint, backgroundColor: "#071B16" },
  successOrb: { width: 48, height: 48, borderRadius: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#123C30", marginBottom: spacing.md },
  successOrbText: { color: P.mint, fontSize: 22, fontWeight: "900" },
  successEyebrow: { ...typography.eyebrow, color: P.mint },
  successTitle: { ...typography.heading, color: P.text, marginTop: spacing.sm },
  successBody: { ...typography.body, color: "#BCD6CB", marginTop: spacing.sm },
  resultRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  resultMetric: { flex: 1, padding: spacing.md, borderRadius: 18, borderWidth: 1, borderColor: "#255546", backgroundColor: "#0B211A" },
  resultLabel: { ...typography.caption, color: "#8DB6A6" },
  resultValue: { ...typography.heading, color: P.mint, marginTop: spacing.xs },
  premiumCard: { marginTop: spacing.md, padding: spacing.lg, borderRadius: 26, borderWidth: 1, borderColor: P.gold, backgroundColor: "#231B0B" },
  premiumEyebrow: { ...typography.eyebrow, color: P.gold },
  premiumTitle: { ...typography.heading, color: P.text, marginTop: spacing.sm },
  premiumBody: { ...typography.body, color: "#D7C9A5", marginTop: spacing.sm },
  primaryButton: { minHeight: 52, marginTop: spacing.lg, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: 18, backgroundColor: P.cyan },
  primaryButtonText: { ...typography.label, color: "#041014", fontWeight: "900" },
  stateCard: { marginTop: spacing.md, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: P.border, backgroundColor: P.panel },
  stateTitle: { ...typography.heading, color: P.text },
  stateBody: { ...typography.body, color: P.muted, marginTop: spacing.sm },
});
