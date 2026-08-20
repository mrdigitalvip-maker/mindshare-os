import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { NativeFormModal } from "@/components/native-form-modal";
import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { useProjects, useTasks, useWorkspaceMutations } from "@/hooks/use-workspaces";
import {
  getProjectAttention,
  getProjectNextAction,
  getProjectOverdueTasks,
  getProjectProgress,
  getProjectStatusLabel,
  groupTasksByProject,
  sortProjectsByAttention,
} from "@/lib/project-selectors";
import { colors, radius, spacing, typography } from "@/lib/theme";
import type { Project, Task } from "@/services/workspace-service";

function ProjectCard({ project, tasks }: { project: Project; tasks: Task[] }) {
  const progress = getProjectProgress(tasks);
  const attention = getProjectAttention(project, tasks);
  const overdue = getProjectOverdueTasks(tasks).length;
  const next = getProjectNextAction(tasks);
  const subdued = ["completed", "archived"].includes(project.status.toLowerCase());
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir projeto ${project.title}. ${attention}`}
      onPress={() => router.push(`/projects/${project.id}`)}
      style={({ pressed }) => [styles.card, subdued && styles.subdued, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <Text numberOfLines={2} style={styles.cardTitle}>
          {project.title}
        </Text>
        <Text
          accessibilityLabel={`Status: ${getProjectStatusLabel(project.status)}`}
          style={styles.status}
        >
          {attention}
        </Text>
      </View>
      {project.description ? (
        <Text numberOfLines={2} style={styles.copy}>
          {project.description}
        </Text>
      ) : null}
      {progress ? (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${progress.completed} de ${progress.total} tarefas concluídas`}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress.ratio * 100) }}
          style={styles.progressBlock}
        >
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress.ratio * 100}%` }]} />
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>
              {progress.completed} de {progress.total} concluídas
            </Text>
            {overdue ? (
              <Text style={styles.overdue}>
                {overdue} {overdue === 1 ? "atrasada" : "atrasadas"}
              </Text>
            ) : null}
          </View>
          {next ? (
            <Text numberOfLines={1} style={styles.next}>
              Próxima: {next.title}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.meta}>Sem tarefas vinculadas</Text>
      )}
    </Pressable>
  );
}

export default function Projetos() {
  const projectsQuery = useProjects();
  const tasksQuery = useTasks();
  const { createProject } = useWorkspaceMutations();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const grouped = useMemo(() => groupTasksByProject(tasksQuery.data ?? []), [tasksQuery.data]);
  const projects = useMemo(
    () => sortProjectsByAttention(projectsQuery.data ?? [], grouped),
    [projectsQuery.data, grouped],
  );
  async function save() {
    try {
      const id = await createProject.mutateAsync({ title, description });
      setOpen(false);
      setTitle("");
      setDescription("");
      router.push(`/projects/${id}`);
    } catch {
      /* The modal preserves input and presents a safe error. */
    }
  }
  async function refresh() {
    setRefreshing(true);
    await Promise.allSettled([projectsQuery.refetch(), tasksQuery.refetch()]);
    setRefreshing(false);
  }
  if (projectsQuery.isPending || tasksQuery.isPending)
    return <LoadingState title="Carregando projetos…" />;
  if (projectsQuery.isError || tasksQuery.isError)
    return (
      <ErrorState
        title="Não foi possível carregar seus projetos."
        message="Tente novamente em instantes."
        actionLabel="Tentar novamente"
        onAction={() => void refresh()}
      />
    );
  const openProjects = projects.filter(
    (project) => !["completed", "archived"].includes(project.status.toLowerCase()),
  ).length;
  const attentionCount = projects.filter(
    (project) => getProjectOverdueTasks(grouped.get(project.id) ?? []).length > 0,
  ).length;
  return (
    <AppScreen contentContainerStyle={styles.page}>
      <StandardHeader
        title="Projetos"
        action={
          <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.add}>
            <Text style={styles.addText}>Novo</Text>
          </Pressable>
        }
      />
      {projects.length ? (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {openProjects} {openProjects === 1 ? "projeto em aberto" : "projetos em aberto"}
          </Text>
          {attentionCount ? (
            <Text style={styles.overdue}>
              {attentionCount} {attentionCount === 1 ? "precisa" : "precisam"} de atenção
            </Text>
          ) : null}
        </View>
      ) : null}
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primaryBright}
            colors={[colors.primaryBright]}
          />
        }
        contentContainerStyle={projects.length ? styles.list : styles.empty}
        ListEmptyComponent={
          <EmptyState
            title="Nenhum projeto ainda."
            message="Crie um projeto para reunir tarefas e acompanhar seu progresso."
            actionLabel="Novo projeto"
            onAction={() => setOpen(true)}
          />
        }
        renderItem={({ item }) => <ProjectCard project={item} tasks={grouped.get(item.id) ?? []} />}
      />
      <NativeFormModal
        visible={open}
        title="Novo projeto"
        placeholder="Nome do projeto"
        value={title}
        onChange={setTitle}
        secondaryValue={description}
        secondaryPlaceholder="Descrição (opcional)"
        onSecondaryChange={setDescription}
        busy={createProject.isPending}
        error={createProject.error ? "Não foi possível salvar o projeto." : null}
        onClose={() => setOpen(false)}
        onSave={() => void save()}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  add: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  addText: { ...typography.label, color: colors.text },
  summary: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  summaryText: { ...typography.caption, color: colors.textMuted },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  empty: { flexGrow: 1 },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  subdued: { opacity: 0.72 },
  pressed: { opacity: 0.76 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  cardTitle: { ...typography.heading, fontSize: 19, lineHeight: 25, color: colors.text, flex: 1 },
  status: {
    ...typography.caption,
    color: colors.primaryBright,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexShrink: 0,
  },
  copy: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  progressBlock: { gap: spacing.sm },
  progressTrack: {
    height: 3,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.primaryBright,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  meta: { ...typography.caption, color: colors.textMuted },
  overdue: { ...typography.caption, color: colors.danger },
  next: { ...typography.caption, color: colors.text },
});
