import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppScreen } from "@/components/app-screen";
import { NativeDateField } from "@/components/native-date-field";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { useJourneyPack, useStartJourneyPack } from "@/hooks/use-journey-packs";
import { packErrorMessage } from "@/lib/journey-packs";
import { colors, radius, spacing, typography } from "@/lib/theme";

const requestKey = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
export default function PackDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>(),
    detail = useJourneyPack(slug ?? ""),
    start = useStartJourneyPack();
  const [preview, setPreview] = useState(false),
    [goal, setGoal] = useState(""),
    [date, setDate] = useState<string | null>(null),
    [context, setContext] = useState("");
  const key = useRef(requestKey());
  if (detail.isPending) return <LoadingState title="Carregando programa…" />;
  if (detail.isError || !detail.data)
    return (
      <ErrorState
        title="Programa indisponível."
        message="Ele pode ter sido retirado ou a conexão falhou."
        actionLabel="Voltar ao catálogo"
        onAction={() => router.replace("/packs")}
      />
    );
  const { pack, steps } = detail.data;
  async function apply() {
    if (!goal.trim() || start.isPending) return;
    try {
      const id = await start.mutateAsync({
        packId: pack.id,
        requestKey: key.current,
        goal,
        targetDate: date,
        context,
      });
      router.replace(`/journeys/${id}`);
    } catch {
      /* rendered below; same key makes retry idempotent */
    }
  }
  return (
    <AppScreen scroll keyboard contentContainerStyle={s.page}>
      <Text style={s.meta}>
        {pack.category.toUpperCase()}
        {pack.durationDays ? ` · ${pack.durationDays} DIAS` : ""}
      </Text>
      <Text style={s.heading}>{pack.title}</Text>
      <Text style={s.lead}>{pack.shortDescription}</Text>
      <Text style={s.body}>{pack.description}</Text>
      <Text style={s.section}>COMO FUNCIONA</Text>
      {steps.map((step) => (
        <View key={step.id} style={s.step}>
          <Text style={s.number}>{step.sequence}</Text>
          <View style={s.grow}>
            <Text style={s.phase}>{step.phase.toUpperCase()}</Text>
            <Text style={s.stepTitle}>{step.title}</Text>
            <Text style={s.body}>{step.description}</Text>
          </View>
        </View>
      ))}
      {!preview ? (
        <Pressable style={s.button} accessibilityRole="button" onPress={() => setPreview(true)}>
          <Text style={s.buttonText}>Preparar programa</Text>
        </Pressable>
      ) : (
        <View style={s.preview}>
          <Text style={s.section}>PREVIEW → CONFIRMAR</Text>
          <Text style={s.body}>
            Seu programa será criado com {steps.length} etapas. Você verá o próximo passo, o
            progresso real e o plano completo dentro da Jornada.
          </Text>
          <TextInput
            style={s.input}
            placeholder="Qual resultado você quer alcançar?"
            placeholderTextColor={colors.textMuted}
            value={goal}
            onChangeText={setGoal}
            maxLength={160}
          />
          <NativeDateField value={date} onChange={setDate} />
          <TextInput
            style={[s.input, s.multiline]}
            multiline
            placeholder="Contexto opcional"
            placeholderTextColor={colors.textMuted}
            value={context}
            onChangeText={setContext}
            maxLength={1000}
          />
          <Text style={s.note}>
            Nada será criado até sua confirmação. Iniciar não concede Momentum.
          </Text>
          {start.isError ? (
            <Text style={s.error}>{packErrorMessage(start.error.message)}</Text>
          ) : null}
          <Pressable
            style={[s.button, (!goal.trim() || start.isPending) && s.disabled]}
            disabled={!goal.trim() || start.isPending}
            accessibilityRole="button"
            onPress={() => void apply()}
          >
            <Text style={s.buttonText}>
              {start.isPending ? "Preparando programa…" : "Iniciar meu programa"}
            </Text>
          </Pressable>
        </View>
      )}
    </AppScreen>
  );
}
const s = StyleSheet.create({
  page: { gap: spacing.md, paddingBottom: spacing.xxl },
  meta: { ...typography.eyebrow, color: colors.primaryBright },
  heading: { ...typography.display, color: colors.text },
  lead: { ...typography.heading, color: colors.text },
  body: { ...typography.body, color: colors.textMuted },
  section: { ...typography.eyebrow, color: colors.text, marginTop: spacing.md },
  step: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  number: { ...typography.heading, color: colors.primaryBright },
  grow: { flex: 1, gap: spacing.xs },
  phase: { ...typography.caption, color: colors.primaryBright },
  stepTitle: { ...typography.label, color: colors.text },
  preview: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
  },
  input: {
    ...typography.body,
    color: colors.text,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 88, paddingTop: spacing.md, textAlignVertical: "top" },
  note: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.body, color: colors.danger },
  button: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  buttonText: { ...typography.label, color: colors.background },
  disabled: { opacity: 0.5 },
});
