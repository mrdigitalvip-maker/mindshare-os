import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { NativeFormModal } from "@/components/native-form-modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { useSubjects, useWorkspaceMutations } from "@/hooks/use-workspaces";
import { colors, radius, spacing, typography } from "@/lib/theme";
export default function Studies() {
  const query = useSubjects();
  const { createSubject } = useWorkspaceMutations();
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  if (query.isPending) return <LoadingState title="Loading studies…" />;
  if (query.isError)
    return (
      <ErrorState
        title="Studies unavailable"
        actionLabel="Retry"
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
        <Text style={styles.title}>Studies</Text>
        <Pressable accessibilityRole="button" onPress={() => setModal(true)} style={styles.add}>
          <Text style={styles.addText}>New</Text>
        </Pressable>
      </View>
      <FlatList
        data={query.data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={query.data.length ? styles.list : styles.empty}
        ListEmptyComponent={
          <EmptyState
            title="No subjects yet"
            message="Create a subject workspace."
            actionLabel="Create subject"
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
            <View>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.copy}>{item.description || item.status}</Text>
            </View>
          </Pressable>
        )}
      />
      <NativeFormModal
        visible={modal}
        title="New subject"
        placeholder="Subject name"
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
  cardTitle: { ...typography.heading, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted },
});
