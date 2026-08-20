import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { NativeFormModal } from "@/components/native-form-modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { useProject, useWorkspaceMutations } from "@/hooks/use-workspaces";
import { colors, radius, spacing, typography } from "@/lib/theme";
export default function ProjectWorkspace() {
  const params = useLocalSearchParams<{ projectId?: string }>();
  const projectId = typeof params.projectId === "string" ? params.projectId.trim() : "";
  const query = useProject(projectId);
  const { mutateTask, updateProject } = useWorkspaceMutations();
  const [taskTitle, setTaskTitle] = useState("");
  const [modal, setModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  if (!projectId)
    return (
      <ErrorState
        title="Projeto não encontrado"
        message="O link do projeto está incompleto."
        actionLabel="Voltar para projetos"
        onAction={() => router.replace("/projects")}
      />
    );
  if (query.isPending) return <LoadingState title="Carregando projeto…" />;
  if (query.isError)
    return (
      <ErrorState
        title="Projeto indisponível"
        actionLabel="Tentar novamente"
        onAction={() => void query.refetch()}
      />
    );
  if (!query.data)
    return (
      <EmptyState
        title="Projeto não encontrado"
        message="Ele pode ter sido removido."
        actionLabel="Voltar para projetos"
        onAction={() => router.replace("/projects")}
      />
    );
  const { project, tasks } = query.data;
  async function addTask() {
    try {
      if (editingTaskId)
        await mutateTask.mutateAsync({
          action: "update",
          taskId: editingTaskId,
          projectId,
          patch: { title: taskTitle },
        });
      else await mutateTask.mutateAsync({ action: "create", title: taskTitle, projectId });
      setTaskTitle("");
      setEditingTaskId(null);
      setModal(false);
    } catch (error) {
      void error;
    }
  }
  return (
    <View style={styles.page}>
      <Stack.Screen options={{ title: project.title }} />
      <View style={styles.summary}>
        <View style={styles.row}>
          <Text style={styles.title}>{project.title}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              void updateProject.mutateAsync({
                projectId,
                patch: { status: project.status === "completed" ? "active" : "completed" },
              })
            }
          >
            <Text style={styles.action}>
              {project.status === "completed" ? "Reopen" : "Complete"}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.copy}>{project.description || "No description"}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setProjectTitle(project.title);
            setProjectDescription(project.description);
            setProjectModal(true);
          }}
        >
          <Text style={styles.action}>Edit project name</Text>
        </Pressable>
        <Text style={styles.progress}>
          {project.progress}% · {tasks.filter((task) => task.completed).length}/{tasks.length} tasks
        </Text>
        <Text style={styles.copy}>
          Next action: {tasks.find((task) => !task.completed)?.title ?? "No open task"}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.section}>Tasks</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setEditingTaskId(null);
            setTaskTitle("");
            setModal(true);
          }}
        >
          <Text style={styles.action}>Add task</Text>
        </Pressable>
      </View>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={tasks.length ? styles.list : styles.empty}
        ListEmptyComponent={
          <EmptyState title="No project tasks" message="Add the next concrete action." />
        }
        renderItem={({ item }) => (
          <View style={styles.task}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setEditingTaskId(item.id);
                setTaskTitle(item.title);
                setModal(true);
              }}
            >
              <Text style={styles.action}>Edit</Text>
            </Pressable>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.completed }}
              onPress={() =>
                void mutateTask.mutateAsync({
                  action: "update",
                  taskId: item.id,
                  projectId,
                  patch: { completed: !item.completed },
                })
              }
              style={styles.taskMain}
            >
              <Text style={[styles.taskText, item.completed && styles.done]}>{item.title}</Text>
              <Text style={styles.meta}>{item.priority}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.title}`}
              onPress={() =>
                void mutateTask.mutateAsync({ action: "delete", taskId: item.id, projectId })
              }
            >
              <Text style={styles.delete}>Delete</Text>
            </Pressable>
          </View>
        )}
      />
      <NativeFormModal
        visible={modal}
        title={editingTaskId ? "Edit project task" : "Project task"}
        placeholder="Next action"
        value={taskTitle}
        onChange={setTaskTitle}
        busy={mutateTask.isPending}
        error={mutateTask.error?.message}
        onClose={() => setModal(false)}
        onSave={() => void addTask()}
      />
      <NativeFormModal
        visible={projectModal}
        title="Edit project"
        placeholder="Project name"
        value={projectTitle}
        onChange={setProjectTitle}
        secondaryValue={projectDescription}
        secondaryPlaceholder="Project description"
        onSecondaryChange={setProjectDescription}
        busy={updateProject.isPending}
        error={updateProject.error?.message}
        onClose={() => setProjectModal(false)}
        onSave={() =>
          void updateProject
            .mutateAsync({
              projectId,
              patch: { title: projectTitle, description: projectDescription },
            })
            .then(() => setProjectModal(false))
        }
      />
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, gap: spacing.md, padding: spacing.md, backgroundColor: colors.background },
  summary: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { ...typography.heading, color: colors.text, flex: 1 },
  copy: { ...typography.body, color: colors.textMuted },
  progress: { ...typography.label, color: colors.success },
  section: { ...typography.heading, color: colors.text },
  action: { ...typography.label, color: colors.primaryBright, padding: spacing.sm },
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
  taskMain: { flex: 1 },
  taskText: { ...typography.body, color: colors.text },
  done: { textDecorationLine: "line-through", color: colors.textMuted },
  meta: { ...typography.label, color: colors.textMuted },
  delete: { ...typography.label, color: colors.danger },
});
