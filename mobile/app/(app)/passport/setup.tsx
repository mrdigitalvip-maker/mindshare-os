import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { usePassportLanguageTracks } from "@/hooks/use-passport";
import { passportGoals, type PassportGoal } from "@/lib/passport";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";

const copy = {
  "pt-BR": {
    title: "Configurar Passport",
    subtitle: "Monte sua preparação internacional com dados reais do KIVRYN.",
    languageStep: "ETAPA 1 DE 4",
    languageEyebrow: "IDIOMA PRINCIPAL",
    languageHeading: "Qual idioma você quer dominar?",
    languageBody:
      "Escolha o idioma principal do seu Passport. As próximas etapas vão usar essa escolha para montar seu objetivo e plano.",
    goalStep: "ETAPA 2 DE 4",
    goalEyebrow: "OBJETIVO PRINCIPAL",
    goalHeading: "Por que esse idioma importa para você?",
    goalBody:
      "Seu objetivo define a direção do plano, das missões e das situações práticas do Passport.",
    loading: "Carregando idiomas do Passport…",
    errorTitle: "Não foi possível carregar os idiomas.",
    errorMessage: "Nenhuma configuração foi alterada. Verifique a conexão e tente novamente.",
    retry: "Tentar novamente",
    empty: "Nenhum idioma está disponível no momento.",
    selected: "Selecionado",
    nextHint: "Idioma e objetivo definidos. Na próxima etapa vamos configurar seu ritmo diário.",
    goals: {
      travel: { title: "Viagem", description: "Aeroporto, hotel, restaurante, transporte e situações reais." },
      work: { title: "Trabalho", description: "Reuniões, comunicação profissional e contexto de negócios." },
      study: { title: "Estudos", description: "Aprendizado acadêmico, leitura, compreensão e rotina de estudo." },
      conversation: { title: "Conversação", description: "Falar com mais naturalidade e responder com confiança." },
      culture: { title: "Cultura", description: "Entender pessoas, costumes, expressões e contexto local." },
    },
  },
  en: {
    title: "Set up Passport",
    subtitle: "Build your international readiness plan with real KIVRYN data.",
    languageStep: "STEP 1 OF 4",
    languageEyebrow: "PRIMARY LANGUAGE",
    languageHeading: "Which language do you want to master?",
    languageBody:
      "Choose the primary language for your Passport. The next steps will use this choice to build your goal and plan.",
    goalStep: "STEP 2 OF 4",
    goalEyebrow: "PRIMARY GOAL",
    goalHeading: "Why does this language matter to you?",
    goalBody:
      "Your goal shapes the direction of your plan, missions and practical Passport situations.",
    loading: "Loading Passport languages…",
    errorTitle: "Languages could not be loaded.",
    errorMessage: "No settings were changed. Check your connection and try again.",
    retry: "Try again",
    empty: "No language is available right now.",
    selected: "Selected",
    nextHint: "Language and goal are set. Next we'll configure your daily pace.",
    goals: {
      travel: { title: "Travel", description: "Airport, hotel, restaurant, transport and real situations." },
      work: { title: "Work", description: "Meetings, professional communication and business context." },
      study: { title: "Study", description: "Academic learning, reading, comprehension and study routine." },
      conversation: { title: "Conversation", description: "Speak more naturally and respond with confidence." },
      culture: { title: "Culture", description: "Understand people, customs, expressions and local context." },
    },
  },
} as const;

export default function PassportSetup() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const tracks = usePassportLanguageTracks();
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<PassportGoal | null>(null);

  if (tracks.isPending) return <LoadingState title={text.loading} />;
  if (tracks.isError) {
    return (
      <ErrorState
        title={text.errorTitle}
        message={text.errorMessage}
        actionLabel={text.retry}
        onAction={() => void tracks.refetch()}
      />
    );
  }

  const languageTracks = tracks.data ?? [];

  return (
    <AppScreen scroll contentContainerStyle={styles.page}>
      <StandardHeader title={text.title} subtitle={text.subtitle} />

      <View style={styles.progressRow}>
        <Text style={styles.step}>{selectedTrackId ? text.goalStep : text.languageStep}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: selectedTrackId ? "50%" : "25%" }]} />
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{text.languageEyebrow}</Text>
        <Text style={styles.heading}>{text.languageHeading}</Text>
        <Text style={styles.body}>{text.languageBody}</Text>
      </View>

      <View style={styles.list}>
        {languageTracks.length ? (
          languageTracks.map((track) => {
            const selected = selectedTrackId === track.id;
            return (
              <Pressable
                key={track.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  if (track.id !== selectedTrackId) setSelectedGoal(null);
                  setSelectedTrackId(track.id);
                }}
                style={({ pressed }) => [
                  styles.choiceCard,
                  selected && styles.choiceCardSelected,
                  pressed && styles.choiceCardPressed,
                ]}
              >
                <View style={styles.choiceCopy}>
                  <Text style={[styles.choiceTitle, selected && styles.choiceTitleSelected]}>
                    {track.title}
                  </Text>
                  {track.description ? <Text style={styles.choiceDescription}>{track.description}</Text> : null}
                </View>
                <View style={[styles.selector, selected && styles.selectorSelected]}>
                  {selected ? <View style={styles.selectorDot} /> : null}
                </View>
                {selected ? <Text style={styles.selectedLabel}>{text.selected}</Text> : null}
              </Pressable>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{text.empty}</Text>
          </View>
        )}
      </View>

      {selectedTrackId ? (
        <>
          <View style={styles.sectionHero}>
            <Text style={styles.eyebrow}>{text.goalEyebrow}</Text>
            <Text style={styles.heading}>{text.goalHeading}</Text>
            <Text style={styles.body}>{text.goalBody}</Text>
          </View>

          <View style={styles.list}>
            {passportGoals.map((goal) => {
              const selected = selectedGoal === goal;
              const goalCopy = text.goals[goal];
              return (
                <Pressable
                  key={goal}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedGoal(goal)}
                  style={({ pressed }) => [
                    styles.choiceCard,
                    selected && styles.choiceCardSelected,
                    pressed && styles.choiceCardPressed,
                  ]}
                >
                  <View style={styles.choiceCopy}>
                    <Text style={[styles.choiceTitle, selected && styles.choiceTitleSelected]}>
                      {goalCopy.title}
                    </Text>
                    <Text style={styles.choiceDescription}>{goalCopy.description}</Text>
                  </View>
                  <View style={[styles.selector, selected && styles.selectorSelected]}>
                    {selected ? <View style={styles.selectorDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {selectedTrackId && selectedGoal ? (
        <View style={styles.nextHintCard}>
          <Text style={styles.nextHint}>{text.nextHint}</Text>
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: spacing.xl },
  progressRow: { marginTop: spacing.md, gap: spacing.sm },
  step: { ...typography.eyebrow, color: colors.primaryBright },
  progressTrack: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.primaryBright,
  },
  hero: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sectionHero: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvasElevated,
  },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  heading: { ...typography.title, color: colors.text, marginTop: spacing.sm },
  body: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  list: { marginTop: spacing.md, gap: spacing.sm },
  choiceCard: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceCardSelected: {
    borderColor: colors.borderActive,
    backgroundColor: colors.surfaceRaised,
  },
  choiceCardPressed: { opacity: 0.82 },
  choiceCopy: { flex: 1, minWidth: 0 },
  choiceTitle: { ...typography.heading, color: colors.text },
  choiceTitleSelected: { color: colors.primaryBright },
  choiceDescription: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  selector: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderActive,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorSelected: { borderColor: colors.primaryBright },
  selectorDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryBright,
  },
  selectedLabel: { ...typography.caption, color: colors.primaryBright },
  emptyCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyText: { ...typography.body, color: colors.textMuted },
  nextHintCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvasElevated,
  },
  nextHint: { ...typography.caption, color: colors.textSecondary },
});
