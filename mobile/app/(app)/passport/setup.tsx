import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { usePassportLanguageTracks } from "@/hooks/use-passport";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";

const copy = {
  "pt-BR": {
    title: "Configurar Passport",
    subtitle: "Monte sua preparação internacional com dados reais do KIVRYN.",
    step: "ETAPA 1 DE 4",
    eyebrow: "IDIOMA PRINCIPAL",
    heading: "Qual idioma você quer dominar?",
    body: "Escolha o idioma principal do seu Passport. As próximas etapas vão usar essa escolha para montar seu objetivo e plano.",
    loading: "Carregando idiomas do Passport…",
    errorTitle: "Não foi possível carregar os idiomas.",
    errorMessage: "Nenhuma configuração foi alterada. Verifique a conexão e tente novamente.",
    retry: "Tentar novamente",
    empty: "Nenhum idioma está disponível no momento.",
    selected: "Selecionado",
    nextHint: "Depois desta escolha, vamos definir seu objetivo e ritmo diário.",
  },
  en: {
    title: "Set up Passport",
    subtitle: "Build your international readiness plan with real KIVRYN data.",
    step: "STEP 1 OF 4",
    eyebrow: "PRIMARY LANGUAGE",
    heading: "Which language do you want to master?",
    body: "Choose the primary language for your Passport. The next steps will use this choice to build your goal and plan.",
    loading: "Loading Passport languages…",
    errorTitle: "Languages could not be loaded.",
    errorMessage: "No settings were changed. Check your connection and try again.",
    retry: "Try again",
    empty: "No language is available right now.",
    selected: "Selected",
    nextHint: "After this choice, we'll define your goal and daily pace.",
  },
} as const;

export default function PassportSetup() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const tracks = usePassportLanguageTracks();
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

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
        <Text style={styles.step}>{text.step}</Text>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{text.eyebrow}</Text>
        <Text style={styles.heading}>{text.heading}</Text>
        <Text style={styles.body}>{text.body}</Text>
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
                onPress={() => setSelectedTrackId(track.id)}
                style={({ pressed }) => [
                  styles.languageCard,
                  selected && styles.languageCardSelected,
                  pressed && styles.languageCardPressed,
                ]}
              >
                <View style={styles.languageCopy}>
                  <Text style={[styles.languageTitle, selected && styles.languageTitleSelected]}>
                    {track.title}
                  </Text>
                  {track.description ? <Text style={styles.languageDescription}>{track.description}</Text> : null}
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
    width: "25%",
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
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  heading: { ...typography.title, color: colors.text, marginTop: spacing.sm },
  body: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  list: { marginTop: spacing.md, gap: spacing.sm },
  languageCard: {
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
  languageCardSelected: {
    borderColor: colors.borderActive,
    backgroundColor: colors.surfaceRaised,
  },
  languageCardPressed: { opacity: 0.82 },
  languageCopy: { flex: 1, minWidth: 0 },
  languageTitle: { ...typography.heading, color: colors.text },
  languageTitleSelected: { color: colors.primaryBright },
  languageDescription: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
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
