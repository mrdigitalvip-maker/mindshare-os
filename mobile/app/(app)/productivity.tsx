import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeFormModal } from "@/components/native-form-modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { useTasks, useWorkspaceMutations } from "@/hooks/use-workspaces";
import { colors, radius, spacing, typography } from "@/lib/theme";
import type { Task } from "@/services/workspace-service";
type Filter = "Today" | "Inbox" | "Upcoming" | "Overdue" | "Completed";
const filters: Filter[] = ["Today", "Inbox", "Upcoming", "Overdue", "Completed"];
const dateOnly = () => new Date().toISOString().slice(0, 10);
function matches(task: Task, filter: Filter) {
  const today = dateOnly();
  if (filter === "Completed") return task.completed;
  if (task.completed) return false;
  if (filter === "Inbox") return !task.dueDate;
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
  const [editing, setEditing] = useState<Task | null>(null);
  const tasks = useMemo(
    () => (query.data ?? []).filter((task) => matches(task, filter)),
    [query.data, filter],
  );
  if (query.isPending) return <LoadingState title="Loading tasks…" />;
  if (query.isError)
    return (
      <ErrorState
        title="Tasks unavailable"
        actionLabel="Retry"
        onAction={() => void query.refetch()}
      />
    );
  function openEditor(task?: Task) {
    setEditing(task ?? null);
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
      setEditing(null);
    } catch (error) {
      void error;
    }
  }
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <Pressable accessibilityRole="button" onPress={() => openEditor()} style={styles.add}>
          <Text style={styles.addText}>New</Text>
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
            title={`No ${filter.toLowerCase()} tasks`}
            message="This is a valid clear state."
            actionLabel="Create task"
            onAction={() => openEditor()}
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
                {item.priority} · {item.dueDate ?? "Inbox"}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => openEditor(item)}>
              <Text style={styles.edit}>Edit</Text>
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
              <Text style={styles.delete}>Delete</Text>
            </Pressable>
          </View>
        )}
      />
      <NativeFormModal
        visible={modal}
        title={editing ? "Edit task" : "New task"}
        placeholder="Task title"
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
