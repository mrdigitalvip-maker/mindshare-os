import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { NativeFormModal } from "@/components/native-form-modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { useProjects, useWorkspaceMutations } from "@/hooks/use-workspaces";
import { colors, radius, spacing, typography } from "@/lib/theme";
export default function Projetos() {
  const query = useProjects();
  const { createProject } = useWorkspaceMutations();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  async function save() {
    try {
      const id = await createProject.mutateAsync(title);
      setOpen(false);
      setTitle("");
      router.push(`/projects/${id}`);
    } catch (error) {
      void error;
    }
  }
  if (query.isPending) return <LoadingState title="Carregando projetos…" />;
  if (query.isError)
    return (
      <ErrorState
        title="Não foi possível carregar agora."
        message="Seus projetos continuam salvos."
        actionLabel="Tentar novamente"
        onAction={() => void query.refetch()}
      />
    );
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Projetos</Text>
        <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.add}>
          <Text style={styles.addText}>Novo</Text>
        </Pressable>
      </View>
      <FlatList
        data={query.data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={query.data.length ? styles.list : styles.empty}
        ListEmptyComponent={
          <EmptyState
            title="Você ainda não tem projetos."
            message="Crie seu primeiro projeto para começar."
            actionLabel="Criar projeto"
            onAction={() => setOpen(true)}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/projects/${item.id}`)}
            style={styles.card}
          >
            <View style={styles.row}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.status}>{item.status}</Text>
            </View>
            <Text numberOfLines={2} style={styles.copy}>
              {item.description || "Sem descrição"}
            </Text>
            <Text style={styles.progress}>{item.progress}% concluído</Text>
          </Pressable>
        )}
      />
      <NativeFormModal
        visible={open}
        title="Novo project"
        placeholder="Nome do projeto"
        value={title}
        onChange={setTitle}
        busy={createProject.isPending}
        error={createProject.error?.message}
        onClose={() => setOpen(false)}
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
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  cardTitle: { ...typography.heading, color: colors.text, flex: 1 },
  status: { ...typography.label, color: colors.primaryBright },
  copy: { ...typography.body, color: colors.textMuted },
  progress: { ...typography.label, color: colors.success },
});
