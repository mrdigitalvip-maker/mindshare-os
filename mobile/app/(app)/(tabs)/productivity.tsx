import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeFormModal } from "@/components/native-form-modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { useTasks, useWorkspaceMutations } from "@/hooks/use-workspaces";
import { colors, radius, spacing, typography } from "@/lib/theme";
import type { Task } from "@/services/workspace-service";
type Filter = "Today" | "Entrada" | "Upcoming" | "Overdue" | "Completed";
const filters: Filter[] = ["Today", "Entrada", "Upcoming", "Overdue", "Completed"];
const dateOnly = () => new Date().toISOString().slice(0, 10);
function matches(task: Task, filter: Filter) {
  const today = dateOnly();
  if (filter === "Completed") return task.completed;
  if (task.completed) return false;
  if (filter === "Entrada") return !task.dueDate;
  if (filter === "Today") return task.dueDate === today;
  if (filter === "Overdue") return Boolean(task.dueDate && task.dueDate < today);
  return Boolean(task.dueDate && task.dueDate > today);
}
export default function Productivity() {
  const query = useTasks();
  const { mutateTask } = useWorkspaceMutations();
  const [filter, setFilter] = useState<Filter>("Today");
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState("");
  const [editing, setEditaring] = useState<Task | null>(null);
  const tasks = useMemo(
    () => (query.data ?? []).filter((task) => matches(task, filter)),
    [query.data, filter],
  );
  if (query.isPending) return <LoadingState title="Carregando tarefas…" />;
  if (query.isError)
    return (
      <ErrorState
        title="Não foi possível carregar agora."
        actionLabel="Tentar novamente"
        onAction={() => void query.refetch()}
      />
    );
  function openEditaror(task?: Task) {
    setEditaring(task ?? null);
    setTitle(task?.title ?? "");
    setModal(true);
  }
  async function save() {
    try {
      if (editing)
        await mutateTask.mutateAsync({
          action: "update",
          taskId: editing.id,
          projectId: editing.projectId,
          patch: { title },
        });
      else
        await mutateTask.mutateAsync({
          action: "create",
          title,
          dueDate: filter === "Today" ? dateOnly() : null,
        });
      setModal(false);
      setTitle("");
      setEditaring(null);
    } catch (error) {
      void error;
    }
  }
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Tarefas</Text>
        <Pressable accessibilityRole="button" onPress={() => openEditaror()} style={styles.add}>
          <Text style={styles.addText}>Nova</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {filters.map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item}
            onPress={() => setFilter(item)}
            style={[styles.filter, item === filter && styles.activeFilter]}
          >
            <Text style={[styles.filterText, item === filter && styles.activeText]}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={tasks.length ? styles.list : styles.empty}
        ListEmptyComponent={
          <EmptyState
            title={`Nenhuma tarefa por aqui.`}
            message="Sua lista está em dia."
            actionLabel="Criar tarefa"
            onAction={() => openEditaror()}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.task}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.completed }}
              onPress={() =>
                void mutateTask.mutateAsync({
                  action: "update",
                  taskId: item.id,
                  projectId: item.projectId,
                  patch: { completed: !item.completed },
                })
              }
              style={styles.main}
            >
              <Text style={[styles.taskTitle, item.completed && styles.done]}>{item.title}</Text>
              <Text style={styles.meta}>
                {item.priority} · {item.dueDate ?? "Entrada"}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => openEditaror(item)}>
              <Text style={styles.edit}>Editar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                void mutateTask.mutateAsync({
                  action: "delete",
                  taskId: item.id,
                  projectId: item.projectId,
                })
              }
            >
              <Text style={styles.delete}>Excluir</Text>
            </Pressable>
          </View>
        )}
      />
      <NativeFormModal
        visible={modal}
        title={editing ? "Editar task" : "Nova task"}
        placeholder="Título da tarefa"
        value={title}
        onChange={setTitle}
        busy={mutateTask.isPending}
        error={mutateTask.error?.message}
        onClose={() => setModal(false)}
        onSave={() => void save()}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, padding: spacing.md, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { ...typography.title, color: colors.text },
  add: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  addText: { ...typography.label, color: colors.text },
  filters: { gap: spacing.sm, paddingVertical: spacing.md },
  filter: {
    height: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  activeFilter: { backgroundColor: colors.primary },
  filterText: { ...typography.label, color: colors.textMuted },
  activeText: { color: colors.text },
  list: { gap: spacing.sm },
  empty: { flexGrow: 1 },
  task: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  main: { flex: 1 },
  taskTitle: { ...typography.body, color: colors.text },
  done: { textDecorationLine: "line-through", color: colors.textMuted },
  meta: { ...typography.label, color: colors.textMuted },
  edit: { ...typography.label, color: colors.primaryBright },
  delete: { ...typography.label, color: colors.danger },
});
