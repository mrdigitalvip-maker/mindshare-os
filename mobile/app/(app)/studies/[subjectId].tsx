import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { NativeFormModal } from "@/components/native-form-modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { useSubject, useWorkspaceMutations } from "@/hooks/use-workspaces";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { getDisplayProjectStatus } from "@/lib/presentation";
type Mode = "goal" | "session" | "note" | null;
export default function SubjectWorkspace() {
  const params = useLocalSearchParams<{ subjectId?: string }>();
  const subjectId = typeof params.subjectId === "string" ? params.subjectId.trim() : "";
  const query = useSubject(subjectId);
  const { study } = useWorkspaceMutations();
  const [mode, setMode] = useState<Mode>(null);
  const [value, setValue] = useState("");
  const [noteId, setNoteId] = useState<string>();
  const [noteContent, setNoteContent] = useState("");
  if (!subjectId)
    return (
      <ErrorState
        title="Matéria não encontrada"
        message="Volte e escolha uma matéria válida."
        actionLabel="Voltar para estudos"
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
  if (!query.data)
    return <EmptyState title="Matéria não encontrada" message="Ela pode ter sido removida." />;
  const { subject, goals, sessions, notes } = query.data;
  async function save() {
    try {
      if (mode === "goal") await study.mutateAsync({ action: "goal", subjectId, title: value });
      if (mode === "session")
        await study.mutateAsync({ action: "session", subjectId, activity: value, duration: 25 });
      if (mode === "note")
        await study.mutateAsync({
          action: "note",
          subjectId,
          id: noteId,
          title: value,
          content: noteContent,
        });
      setMode(null);
      setValue("");
      setNoteId(undefined);
      setNoteContent("");
    } catch (error) {
      void error;
    }
  }
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: subject.name }} />
      <View style={styles.hero}>
        <Text style={styles.title}>{subject.name}</Text>
        <Text style={styles.copy}>
          {subject.description || getDisplayProjectStatus(subject.status)}
        </Text>
      </View>
      <Section title="Metas" action="Adicionar meta" onAction={() => setMode("goal")}>
        {goals.length ? (
          goals.map((goal) => (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: goal.completed }}
              key={goal.id}
              onPress={() =>
                void study.mutateAsync({
                  action: "goal-complete",
                  subjectId,
                  goalId: goal.id,
                  completed: !goal.completed,
                })
              }
              style={styles.item}
            >
              <Text style={[styles.itemTítulo, goal.completed && styles.done]}>{goal.title}</Text>
              <Text style={styles.meta}>
                {goal.currentValue}/{goal.targetValue}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.empty}>Nenhuma meta ainda.</Text>
        )}
      </Section>
      <Section title="Sessões" action="Registrar 25 min" onAction={() => setMode("session")}>
        {sessions.length ? (
          sessions.map((session) => (
            <View key={session.id} style={styles.item}>
              <Text style={styles.itemTítulo}>{session.activity}</Text>
              <Text style={styles.meta}>{session.duration} min</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Nenhuma sessão ainda.</Text>
        )}
      </Section>
      <Section
        title="Notas"
        action="Adicionar nota"
        onAction={() => {
          setNoteId(undefined);
          setNoteContent("");
          setValue("");
          setMode("note");
        }}
      >
        {notes.length ? (
          notes.map((note) => (
            <View key={note.id} style={styles.item}>
              <View style={styles.flex}>
                <Text style={styles.itemTítulo}>{note.title}</Text>
                <Text numberOfLines={2} style={styles.meta}>
                  {note.content || "Nota vazia"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setNoteId(note.id);
                  setNoteContent(note.content);
                  setValue(note.title);
                  setMode("note");
                }}
              >
                <Text style={styles.action}>Editar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  void study.mutateAsync({ action: "delete-note", subjectId, noteId: note.id })
                }
              >
                <Text style={styles.delete}>Excluir</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Nenhuma nota ainda.</Text>
        )}
      </Section>
      <NativeFormModal
        visible={Boolean(mode)}
        title={
          mode === "goal" ? "Nova meta" : mode === "session" ? "Sessão de estudo" : "Nova nota"
        }
        placeholder={mode === "session" ? "O que você estudou?" : "Título"}
        value={value}
        onChange={setValue}
        secondaryValue={mode === "note" ? noteContent : undefined}
        secondaryPlaceholder="Conteúdo da nota"
        onSecondaryChange={setNoteContent}
        busy={study.isPending}
        error={study.error?.message}
        onClose={() => setMode(null)}
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
  action: string;
  onAction(): void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Text style={styles.heading}>{title}</Text>
        <Pressable accessibilityRole="button" onPress={onAction}>
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  page: { gap: spacing.md, padding: spacing.md, backgroundColor: colors.background },
  hero: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  title: { ...typography.title, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted },
  section: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heading: { ...typography.heading, color: colors.text },
  action: { ...typography.label, color: colors.primaryBright, padding: spacing.sm },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  flex: { flex: 1 },
  itemTítulo: { ...typography.body, color: colors.text },
  done: { textDecorationLine: "line-through", color: colors.textMuted },
  meta: { ...typography.label, color: colors.textMuted },
  empty: { ...typography.body, color: colors.textMuted },
  delete: { ...typography.label, color: colors.danger },
});
