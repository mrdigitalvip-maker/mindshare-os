import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { NativeFormModal } from "@/components/native-form-modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { useSubjects, useWorkspaceMutations } from "@/hooks/use-workspaces";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { getDisplayProjectStatus } from "@/lib/presentation";
export default function Estudos() {
  const query = useSubjects();
  const { createSubject } = useWorkspaceMutations();
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
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
    try {
      const id = await createSubject.mutateAsync(name);
      setModal(false);
      setName("");
      router.push(`/studies/${id}`);
    } catch (error) {
      void error;
    }
  }
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Estudos</Text>
        <Pressable accessibilityRole="button" onPress={() => setModal(true)} style={styles.add}>
          <Text style={styles.addText}>Nova</Text>
        </Pressable>
      </View>
      <FlatList
        data={query.data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={query.data.length ? styles.list : styles.empty}
        ListEmptyComponent={
          <EmptyState
            title="Comece criando sua primeira matéria."
            message="Organize metas, sessões e notas em um só lugar."
            actionLabel="Criar matéria"
            onAction={() => setModal(true)}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/studies/${item.id}`)}
            style={styles.card}
          >
            <View style={[styles.color, { backgroundColor: item.color }]} />
            <View style={styles.cardCopy}>
              <Text numberOfLines={2} style={styles.cardTitle}>
                {item.name}
              </Text>
              <Text numberOfLines={2} style={styles.copy}>
                {item.description || getDisplayProjectStatus(item.status)}
              </Text>
            </View>
          </Pressable>
        )}
      />
      <NativeFormModal
        visible={modal}
        title="Nova matéria"
        placeholder="Nome da matéria"
        value={name}
        onChange={setName}
        busy={createSubject.isPending}
        error={createSubject.error?.message}
        onClose={() => setModal(false)}
        onSave={() => void save()}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, padding: spacing.md, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: { ...typography.title, color: colors.text },
  add: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  addText: { ...typography.label, color: colors.text },
  list: { gap: spacing.sm },
  empty: { flexGrow: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  color: { width: 12, height: 48, borderRadius: radius.pill },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { ...typography.heading, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted },
});
