import { useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { NativeFormModal } from "@/components/native-form-modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { useStudyOverview, useWorkspaceMutations } from "@/hooks/use-workspaces";
import {
  getTodayStudyMinutes,
  getWeeklyStudyMinutes,
  selectStudyFocus,
} from "@/lib/study-selectors";
import { colors, radius, shadows, spacing, typography } from "@/lib/theme";
import { V2Progress } from "@/components/v2/premium-ui";
import { useLanguage } from "@/providers/language-provider";

const copy = {
  "pt-BR": {
    title: "Estudos",
    subtitle: "Aprenda com direção, ritmo e memória.",
    newPlan: "+ Novo plano",
    learningSystem: "LEARNING ENGINE",
    today: "hoje",
    week: "esta semana",
    active: "planos ativos",
    focus: "FOCO DE APRENDIZADO",
    continue: "Continuar estudo",
    resume: "Retomar sessão",
    intelligence: "KIVRYN STUDY INTELLIGENCE",
    intelligenceCopy: "A KIVRYN lê seu objetivo, ritmo e histórico para decidir o melhor próximo passo de aprendizagem.",
    buildPlan: "Criar plano com IA",
    review: "Revisar meu progresso",
    library: "TRILHAS DE APRENDIZADO",
    weeklyGoal: "Meta semanal",
    next: "Próximo passo",
    noNext: "Defina o próximo passo para manter o ritmo.",
    zeroWeek: "Ainda sem minutos nesta semana",
    activeLabel: "Ativa",
    pausedLabel: "Pausada",
    completeLabel: "Concluída",
    systemTitle: "SISTEMA DE CONHECIMENTO",
    systemCopy: "Estudos não ficam isolados: sessões alimentam seu histórico, o Dashboard e o KIVRYN Core para orientar revisões e continuidade.",
    sourcesTitle: "FONTES E CONEXÕES",
    sourcesCopy: "Google Drive entra aqui para materiais; Calendar para sessões e revisões. A conexão real será ativada pelo Connections Hub.",
  },
  en: {
    title: "Studies",
    subtitle: "Learn with direction, rhythm and memory.",
    newPlan: "+ New plan",
    learningSystem: "LEARNING ENGINE",
    today: "today",
    week: "this week",
    active: "active plans",
    focus: "LEARNING FOCUS",
    continue: "Continue studying",
    resume: "Resume session",
    intelligence: "KIVRYN STUDY INTELLIGENCE",
    intelligenceCopy: "KIVRYN reads your goal, rhythm and history to decide the best next learning step.",
    buildPlan: "Build plan with AI",
    review: "Review my progress",
    library: "LEARNING PATHS",
    weeklyGoal: "Weekly goal",
    next: "Next step",
    noNext: "Define the next step to keep momentum.",
    zeroWeek: "No study minutes this week yet",
    activeLabel: "Active",
    pausedLabel: "Paused",
    completeLabel: "Completed",
    systemTitle: "KNOWLEDGE SYSTEM",
    systemCopy: "Studies do not live in isolation: sessions feed your history, Dashboard and KIVRYN Core for smarter reviews and continuity.",
    sourcesTitle: "SOURCES & CONNECTIONS",
    sourcesCopy: "Google Drive belongs here for study materials; Calendar for sessions and reviews. Real connection will be enabled through Connections Hub.",
  },
} as const;

export default function Estudos() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const query = useStudyOverview();
  const { createSubject } = useWorkspaceMutations();
  const savingRef = useRef(false);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [weekly, setWeekly] = useState("120");

  const workspaces = query.data ?? [];
  const allSessions = workspaces.flatMap((item) => item.sessions);
  const todayMinutes = getTodayStudyMinutes(allSessions);
  const weeklyMinutes = getWeeklyStudyMinutes(allSessions);
  const focus = useMemo(() => selectStudyFocus(workspaces), [workspaces]);
  const activeCount = workspaces.filter((item) => item.subject.status === "active").length;

  if (query.isPending) return <LoadingState title="Carregando estudos…" />;
  if (query.isError)
    return (
      <ErrorState
        title="Não foi possível carregar agora."
        actionLabel="Tentar novamente"
        onAction={() => void query.refetch()}
      />
    );

  async function save() {
    if (savingRef.current) return;
    const parsed = weekly.trim() ? Number(weekly) : null;
    if (parsed !== null && (!Number.isInteger(parsed) || parsed < 1 || parsed > 10080)) return;
    savingRef.current = true;
    try {
      const id = await createSubject.mutateAsync({ name, objective, weeklyTargetMinutes: parsed });
      setModal(false);
      setName("");
      setObjective("");
      setWeekly("120");
      router.push(`/studies/${id}`);
    } finally {
      savingRef.current = false;
    }
  }

  function askKivryn(prompt: string) {
    router.push({ pathname: "/assistant-chat", params: { prompt } });
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>{text.title}</Text>
          <Text style={styles.subtitle}>{text.subtitle}</Text>
        </View>
        <Pressable onPress={() => setModal(true)} style={styles.add}>
          <Text style={styles.addText}>{text.newPlan}</Text>
        </Pressable>
      </View>

      <FlatList
        data={workspaces}
        keyExtractor={(item) => item.subject.id}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={workspaces.length ? styles.list : styles.empty}
        ListHeaderComponent={
          <View style={styles.heroStack}>
            <View style={styles.engineCard}>
              <View style={styles.engineGlowA} />
              <View style={styles.engineGlowB} />
              <Text style={styles.engineEyebrow}>{text.learningSystem}</Text>
              <View style={styles.engineMetrics}>
                <Metric value={todayMinutes} label={text.today} suffix="min" />
                <View style={styles.metricDivider} />
                <Metric value={weeklyMinutes} label={text.week} suffix="min" />
                <View style={styles.metricDivider} />
                <Metric value={activeCount} label={text.active} />
              </View>
            </View>

            {focus ? (
              <View style={styles.focusCard}>
                <View style={[styles.subjectOrb, { borderColor: focus.subject.color }]}>
                  <Text style={styles.subjectOrbText}>◎</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.focusEyebrow}>{text.focus}</Text>
                  <Text style={styles.focusTitle}>{focus.subject.name}</Text>
                  <Text style={styles.focusCopy}>
                    {focus.subject.nextAction
                      ? `${text.next}: ${focus.subject.nextAction}`
                      : focus.subject.objective || text.noNext}
                  </Text>
                  <View style={styles.focusMetaRow}>
                    <Text style={styles.focusMeta}>{getWeeklyStudyMinutes(focus.sessions)} min</Text>
                    {focus.subject.weeklyTargetMinutes ? (
                      <Text style={styles.focusMeta}>/ {focus.subject.weeklyTargetMinutes} min</Text>
                    ) : null}
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/studies/${focus.subject.id}`)}
                  style={styles.focusAction}
                >
                  <Text style={styles.focusActionText}>
                    {focus.sessions.some((session) => session.status === "active") ? text.resume : text.continue}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.intelligenceCard}>
              <View style={styles.sparkBadge}><Text style={styles.spark}>✦</Text></View>
              <View style={styles.flex}>
                <Text style={styles.intelligenceEyebrow}>{text.intelligence}</Text>
                <Text style={styles.intelligenceCopy}>{text.intelligenceCopy}</Text>
              </View>
              <View style={styles.aiButtons}>
                <Pressable
                  onPress={() => askKivryn("Quero criar um plano de estudo forte. Me ajude a definir objetivo, carga semanal, ordem dos tópicos e primeira sessão antes de propor a criação.")}
                  style={styles.aiPrimary}
                >
                  <Text style={styles.aiPrimaryText}>{text.buildPlan}</Text>
                </Pressable>
                <Pressable
                  onPress={() => askKivryn("Analise meus estudos atuais, meu ritmo e meu histórico e diga o que devo revisar ou continuar agora.")}
                  style={styles.aiSecondary}
                >
                  <Text style={styles.aiSecondaryText}>{text.review}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.systemCard}>
              <Text style={styles.systemEyebrow}>{text.systemTitle}</Text>
              <Text style={styles.systemCopy}>{text.systemCopy}</Text>
            </View>

            <View style={styles.connectionCard}>
              <View style={styles.connectionIcon}><Text style={styles.connectionIconText}>↗</Text></View>
              <View style={styles.flex}>
                <Text style={styles.systemEyebrow}>{text.sourcesTitle}</Text>
                <Text style={styles.systemCopy}>{text.sourcesCopy}</Text>
              </View>
            </View>

            {workspaces.length ? <Text style={styles.sectionTitle}>{text.library}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="COMECE SEU PRIMEIRO PLANO DE ESTUDO"
            message="Crie uma matéria, defina o que quer aprender e acompanhe sessões, ritmo e progresso real."
            actionLabel="Criar matéria"
            onAction={() => setModal(true)}
          />
        }
        renderItem={({ item }) => {
          const itemWeeklyMinutes = getWeeklyStudyMinutes(item.sessions);
          const target = item.subject.weeklyTargetMinutes;
          const progress = target ? Math.min(100, (itemWeeklyMinutes / target) * 100) : 0;
          const statusLabel =
            item.subject.status === "active"
              ? text.activeLabel
              : item.subject.status === "paused"
                ? text.pausedLabel
                : text.completeLabel;

          return (
            <Pressable
              onPress={() => router.push(`/studies/${item.subject.id}`)}
              style={({ pressed }) => [styles.pathCard, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityHint="Abre o plano de estudo"
            >
              <View style={styles.pathTop}>
                <View style={[styles.pathMarker, { backgroundColor: item.subject.color }]} />
                <View style={styles.flex}>
                  <View style={styles.pathTitleRow}>
                    <Text numberOfLines={1} style={styles.pathTitle}>{item.subject.name}</Text>
                    <Text style={styles.pathStatus}>{statusLabel}</Text>
                  </View>
                  {item.subject.objective ? (
                    <Text numberOfLines={2} style={styles.pathObjective}>{item.subject.objective}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.pathBody}>
                <View style={styles.weeklyRow}>
                  <Text style={styles.weeklyLabel}>{text.weeklyGoal}</Text>
                  <Text style={styles.weeklyValue}>
                    {itemWeeklyMinutes}{target ? ` / ${target}` : ""} min
                  </Text>
                </View>
                {target ? <V2Progress value={progress} label={`Progresso semanal de ${item.subject.name}`} /> : <Text style={styles.meta}>{text.zeroWeek}</Text>}
                <View style={styles.nextBox}>
                  <Text style={styles.nextLabel}>{text.next}</Text>
                  <Text numberOfLines={2} style={styles.nextValue}>{item.subject.nextAction || text.noNext}</Text>
                </View>
              </View>

              <Text style={styles.openPath}>Abrir trilha →</Text>
            </Pressable>
          );
        }}
      />

      <NativeFormModal
        visible={modal}
        title="Novo plano de estudo"
        placeholder="O que você quer estudar?"
        value={name}
        onChange={setName}
        secondaryValue={objective}
        secondaryPlaceholder="O que você quer alcançar?"
        onSecondaryChange={setObjective}
        busy={createSubject.isPending}
        error={createSubject.error?.message}
        errorMessage={createSubject.error?.message}
        onClose={() => {
          if (!savingRef.current) setModal(false);
        }}
        onSave={() => void save()}
      >
        <TextInput
          value={weekly}
          onChangeText={setWeekly}
          keyboardType="number-pad"
          placeholder="Meta semanal em minutos (opcional)"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </NativeFormModal>
    </View>
  );
}

function Metric({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}{suffix ? <Text style={styles.metricSuffix}> {suffix}</Text> : null}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: spacing.md, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  flex: { flex: 1 },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, fontSize: 14, color: colors.textMuted, marginTop: 3 },
  add: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  addText: { ...typography.label, color: colors.text },
  list: { paddingBottom: spacing.xl },
  empty: { flexGrow: 1 },
  heroStack: { gap: spacing.md, marginBottom: spacing.lg },
  engineCard: { overflow: "hidden", padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.accentMuted, backgroundColor: colors.surface, ...shadows.soft },
  engineGlowA: { position: "absolute", width: 170, height: 170, borderRadius: 90, right: -70, top: -90, backgroundColor: colors.accentMuted, opacity: 0.28 },
  engineGlowB: { position: "absolute", width: 120, height: 120, borderRadius: 60, left: -55, bottom: -70, backgroundColor: colors.primary, opacity: 0.14 },
  engineEyebrow: { ...typography.eyebrow, color: colors.primaryBright, letterSpacing: 1.6, marginBottom: spacing.md },
  engineMetrics: { flexDirection: "row", alignItems: "stretch" },
  metric: { flex: 1, minWidth: 0 },
  metricValue: { ...typography.title, fontSize: 24, color: colors.text },
  metricSuffix: { ...typography.caption, color: colors.textMuted },
  metricLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  metricDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: spacing.sm },
  focusCard: { gap: spacing.md, padding: spacing.md, borderRadius: radius.xl, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  subjectOrb: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  subjectOrbText: { color: colors.primaryBright, fontSize: 22 },
  focusEyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  focusTitle: { ...typography.heading, fontSize: 22, color: colors.text, marginTop: 2 },
  focusCopy: { ...typography.body, color: colors.textMuted, marginTop: 4 },
  focusMetaRow: { flexDirection: "row", gap: 4, marginTop: spacing.xs },
  focusMeta: { ...typography.caption, color: colors.textMuted },
  focusAction: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.primary },
  focusActionText: { ...typography.label, color: colors.text },
  intelligenceCard: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  sparkBadge: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised },
  spark: { color: colors.primaryBright, fontSize: 18 },
  intelligenceEyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  intelligenceCopy: { ...typography.body, color: colors.textMuted, marginTop: 4 },
  aiButtons: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  aiPrimary: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.primary },
  aiPrimaryText: { ...typography.label, color: colors.text, textAlign: "center" },
  aiSecondary: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
  aiSecondaryText: { ...typography.label, color: colors.primaryBright, textAlign: "center" },
  systemCard: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised },
  systemEyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  systemCopy: { ...typography.body, color: colors.textMuted, marginTop: 5 },
  connectionCard: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  connectionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised },
  connectionIconText: { color: colors.primaryBright, fontSize: 18 },
  sectionTitle: { ...typography.eyebrow, color: colors.textMuted, marginTop: spacing.sm },
  pathCard: { gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pressed: { opacity: 0.76 },
  pathTop: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  pathMarker: { width: 10, height: 10, borderRadius: 5, marginTop: 7 },
  pathTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pathTitle: { ...typography.heading, color: colors.text, flex: 1 },
  pathStatus: { ...typography.caption, color: colors.primaryBright },
  pathObjective: { ...typography.body, fontSize: 14, color: colors.textMuted, marginTop: 3 },
  pathBody: { gap: spacing.sm },
  weeklyRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  weeklyLabel: { ...typography.caption, color: colors.textMuted },
  weeklyValue: { ...typography.caption, color: colors.text },
  nextBox: { gap: 3, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  nextLabel: { ...typography.eyebrow, color: colors.primaryBright },
  nextValue: { ...typography.body, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  openPath: { ...typography.label, color: colors.primaryBright, alignSelf: "flex-end" },
  input: { minHeight: 50, padding: spacing.md, borderRadius: radius.md, color: colors.text, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
});
