import { LocalizedCopy } from "@/components/localized-copy";
import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { NativeFormModal } from "@/components/native-form-modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { useSubject, useWorkspaceMutations } from "@/hooks/use-workspaces";
import { getStudyProgress, getSubjectActiveGoal } from "@/lib/study-selectors";
import { colors, radius, spacing, typography } from "@/lib/theme";
type Mode = "goal" | "action" | "note" | null;
export default function SubjectWorkspace() {
  const { subjectId: raw } = useLocalSearchParams<{ subjectId?: string }>();
  const subjectId = typeof raw === "string" ? raw.trim() : "";
  const query = useSubject(subjectId);
  const { study } = useWorkspaceMutations();
  const savingRef = useRef(false);
  const [mode, setMode] = useState<Mode>(null),
    [value, setValue] = useState(""),
    [content, setContent] = useState(""),
    [noteId, setNoteId] = useState<string>();
  if (!subjectId)
    return (
      <ErrorState
        title="Matéria não encontrada"
        actionLabel="Voltar"
        onAction={() => router.replace("/studies")}
      />
    );

  if (query.isPending) return <LoadingState title="Carregando matéria…" />;
  if (query.isError)
    return (
      <ErrorState
        title="Não foi possível carregar agora."
        actionLabel="Tentar novamente"
        onAction={() => void query.refetch()}
      />
    );

  if (!query.data) return <EmptyState title="Matéria não encontrada" />;
  const { subject, goals, sessions, notes } = query.data,
    progress = getStudyProgress(query.data),
    active = getSubjectActiveGoal(goals),
    activeSession = sessions.find((s) => s.status === "active");
  async function save() {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      if (mode === "goal") await study.mutateAsync({ action: "goal", subjectId, title: value });
      if (mode === "action")
        await study.mutateAsync({ action: "subject", subjectId, patch: { nextAction: value } });
      if (mode === "note")
        await study.mutateAsync({ action: "note", subjectId, id: noteId, title: value, content });
      setMode(null);
      setValue("");
      setContent("");
      setNoteId(undefined);
    } finally {
      savingRef.current = false;
    }
  }
  async function changeStatus(status: "active" | "paused" | "completed") {
    try {
      await study.mutateAsync({ action: "subject", subjectId, patch: { status } });
    } catch (error) {
      Alert.alert(
        "Não foi possível atualizar",
        error instanceof Error ? error.message : "Tente novamente.",
      );
    }
  }
  function confirmDelete() {
    Alert.alert(
      "Excluir matéria?",
      "Esta ação é permanente. Sessões, metas e notas desta matéria também podem ser excluídas.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir definitivamente",
          style: "destructive",
          onPress: () => {
            if (savingRef.current) return;
            savingRef.current = true;
            void study
              .mutateAsync({ action: "delete-subject", subjectId })
              .then(() => router.replace("/studies"))
              .catch((error: unknown) =>
                Alert.alert(
                  "Não foi possível excluir",
                  error instanceof Error ? error.message : "Tente novamente.",
                ),
              )
              .finally(() => {
                savingRef.current = false;
              });
          },
        },
      ],
    );
  }
  const tutorContext = [
    `Atue como tutor da matéria ${subject.name}.`,
    subject.objective && `Objetivo: ${subject.objective}.`,
    subject.nextAction && `Próximo estudo: ${subject.nextAction}.`,
    active && `Meta ativa: ${active.title}.`,
    notes
      .slice(0, 3)
      .map((n) => `${n.title}: ${n.content.slice(0, 300)}`)
      .join("\n"),
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: subject.name }} />
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>
          <LocalizedCopy copyKey="legacy.2264040e0bae" />
        </Text>
        <Text style={styles.title}>{subject.name}</Text>
        <Text style={styles.copy}>
          {subject.objective || "Defina o que você quer alcançar nesta matéria."}
        </Text>
        {subject.weeklyTargetMinutes ? (
          <Text style={styles.progress}>
            {progress.weeklyMinutes} / {subject.weeklyTargetMinutes} min nesta semana
          </Text>
        ) : null}
      </View>
      <Section title="GERENCIAR MATÉRIA">
        <Text style={styles.copy}>
          Status:{" "}
          {subject.status === "active"
            ? "Em andamento"
            : subject.status === "paused"
              ? "Pausada"
              : "Concluída"}
        </Text>
        <View style={styles.management}>
          {subject.status !== "active" ? (
            <Pressable disabled={study.isPending} onPress={() => void changeStatus("active")}>
              <Text style={styles.link}>
                <LocalizedCopy copyKey="legacy.d977bc4935cd" />
              </Text>
            </Pressable>
          ) : null}
          {subject.status === "active" ? (
            <Pressable disabled={study.isPending} onPress={() => void changeStatus("paused")}>
              <Text style={styles.link}>
                <LocalizedCopy copyKey="legacy.fe8541bd1268" />
              </Text>
            </Pressable>
          ) : null}
          {subject.status !== "completed" ? (
            <Pressable disabled={study.isPending} onPress={() => void changeStatus("completed")}>
              <Text style={styles.link}>
                <LocalizedCopy copyKey="legacy.e40a9b1e2ca6" />
              </Text>
            </Pressable>
          ) : null}
          <Pressable disabled={study.isPending} onPress={confirmDelete}>
            <Text style={styles.delete}>
              <LocalizedCopy copyKey="legacy.e603ce51945e" />
            </Text>
          </Pressable>
        </View>
      </Section>
      <View style={styles.focus}>
        <Text style={styles.eyebrow}>
          <LocalizedCopy copyKey="legacy.2968493cbdb9" />
        </Text>
        <Text style={styles.heading}>
          {subject.nextAction || active?.title || "Defina o próximo objetivo desta matéria."}
        </Text>
        <Text style={styles.copy}>
          <LocalizedCopy copyKey="legacy.30036ff4aded" />
        </Text>
        <Pressable
          style={styles.primary}
          onPress={() => router.push(`/studies/${subjectId}/session`)}
        >
          <Text style={styles.primaryText}>
            {activeSession ? "Retomar sessão" : "Iniciar sessão"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setValue(subject.nextAction ?? "");
            setMode("action");
          }}
        >
          <Text style={styles.link}>
            {subject.nextAction ? "Editar próximo estudo" : "Definir próximo estudo"}
          </Text>
        </Pressable>
      </View>
      <Section title="PROGRESSO">
        <Text style={styles.metric}>
          {progress.weeklyMinutes} min · {progress.sessions}{" "}
          {progress.sessions === 1 ? "sessão" : "sessões"} nesta semana
        </Text>
        {progress.weeklyMinutes === 0 ? (
          <Text style={styles.copy}>
            <LocalizedCopy copyKey="legacy.c38de0c00c4e" />
          </Text>
        ) : null}
      </Section>
      <Section title="METAS" action="Adicionar" onAction={() => setMode("goal")}>
        {goals.map((g) => (
          <Pressable
            key={g.id}
            style={styles.item}
            onPress={() =>
              void study
                .mutateAsync({
                  action: "goal-complete",
                  subjectId,
                  goalId: g.id,
                  completed: !g.completed,
                })
                .catch(() => Alert.alert("Não foi possível atualizar a meta."))
            }
          >
            <Text style={[styles.body, g.completed && styles.done]}>{g.title}</Text>
            <Text style={styles.meta}>
              {g.currentValue}/{g.targetValue}
            </Text>
          </Pressable>
        ))}
        {!goals.length ? (
          <Text style={styles.copy}>
            <LocalizedCopy copyKey="legacy.edeacc331470" />
          </Text>
        ) : null}
      </Section>
      {sessions.some((s) => s.status === "completed") ? (
        <Section title="SESSÕES">
          {sessions
            .filter((s) => s.status === "completed")
            .slice(0, 5)
            .map((s) => (
              <View key={s.id} style={styles.item}>
                <Text style={styles.body}>{s.activity}</Text>
                <Text style={styles.meta}>{s.duration} min</Text>
              </View>
            ))}
        </Section>
      ) : null}
      <Section
        title="MEMÓRIA"
        action="Nova nota"
        onAction={() => {
          setValue("");
          setContent("");
          setNoteId(undefined);
          setMode("note");
        }}
      >
        {notes.map((n) => (
          <Pressable
            key={n.id}
            style={styles.note}
            onPress={() => {
              setValue(n.title);
              setContent(n.content);
              setNoteId(n.id);
              setMode("note");
            }}
          >
            <Text style={styles.body}>{n.title}</Text>
            <Text numberOfLines={2} style={styles.copy}>
              {n.content}
            </Text>
            <Pressable
              onPress={() =>
                void study
                  .mutateAsync({ action: "delete-note", subjectId, noteId: n.id })
                  .catch(() => Alert.alert("Não foi possível excluir a nota."))
              }
            >
              <Text style={styles.delete}>
                <LocalizedCopy copyKey="legacy.e9c74e08e8d2" />
              </Text>
            </Pressable>
          </Pressable>
        ))}
        {!notes.length ? (
          <Text style={styles.copy}>
            <LocalizedCopy copyKey="legacy.3f0469f3d8e7" />
          </Text>
        ) : null}
      </Section>
      <Section title="NEXORA TUTOR">
        <Text style={styles.copy}>
          <LocalizedCopy copyKey="legacy.85d037f04ea1" />
        </Text>
        <Pressable
          style={styles.secondary}
          onPress={() =>
            router.push({
              pathname: "/(app)/(tabs)/assistant-chat",
              params: { prompt: tutorContext },
            })
          }
        >
          <Text style={styles.link}>
            <LocalizedCopy copyKey="legacy.86beaf05d2c4" />
          </Text>
        </Pressable>
      </Section>
      <NativeFormModal
        visible={!!mode}
        title={
          mode === "goal" ? "Nova meta" : mode === "action" ? "Próximo estudo" : "Nota de estudo"
        }
        placeholder={
          mode === "goal"
            ? "Ex.: completar 20 exercícios"
            : mode === "action"
              ? "Ex.: revisar capítulo 4"
              : "Título"
        }
        value={value}
        onChange={setValue}
        secondaryValue={mode === "note" ? content : undefined}
        secondaryPlaceholder="Conteúdo"
        onSecondaryChange={setContent}
        busy={study.isPending}
        error={study.error?.message}
        errorMessage={study.error?.message}
        onClose={() => {
          if (!savingRef.current) setMode(null);
        }}
        onSave={() => void save()}
      />
    </ScrollView>
  );
}
function Section({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Text style={styles.eyebrow}>{title}</Text>
        {action ? (
          <Pressable onPress={onAction}>
            <Text style={styles.link}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  page: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
  },
  hero: { gap: spacing.sm, paddingVertical: spacing.md },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  title: { ...typography.display, color: colors.text },
  heading: { ...typography.heading, color: colors.text },
  body: { ...typography.body, color: colors.text, flex: 1 },
  copy: { ...typography.body, color: colors.textMuted },
  progress: { ...typography.label, color: colors.primaryBright },
  focus: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentMuted,
  },
  primary: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryText: { ...typography.label, color: colors.text },
  link: { ...typography.label, color: colors.primaryBright, paddingVertical: spacing.sm },
  section: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metric: { ...typography.heading, color: colors.text },
  item: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  meta: { ...typography.label, color: colors.textMuted },
  done: { textDecorationLine: "line-through", color: colors.textMuted },
  note: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  delete: { ...typography.caption, color: colors.danger, paddingVertical: spacing.sm },
  management: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  secondary: { minHeight: 44, justifyContent: "center" },
});
