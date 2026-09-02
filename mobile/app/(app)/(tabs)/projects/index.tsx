import { useMemo, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { NativeFormModal } from "@/components/native-form-modal";
import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { useProjects, useTasks, useWorkspaceMutations } from "@/hooks/use-workspaces";
import {
  getProjectAttention,
  getProjectDeadlineState,
  getProjectDeadlineSummary,
  getProjectBlockedTasks,
  getProjectHealthLabel,
  getProjectHealthState,
  getProjectNextAction,
  getProjectOverdueTasks,
  getProjectProgress,
  getProjectsOverview,
  getProjectStatusLabel,
  groupTasksByProject,
  sortProjectsByAttention,
} from "@/lib/project-selectors";
import { colors, radius, spacing, typography } from "@/lib/theme";
import type { Project, Task } from "@/services/workspace-service";

function ProjectCard({ project, tasks }: { project: Project; tasks: Task[] | null }) {
  const taskDataAvailable = tasks !== null;
  const canonicalTasks = tasks ?? [];
  const progress = taskDataAvailable ? getProjectProgress(canonicalTasks) : null;
  const attention = taskDataAvailable
    ? getProjectAttention(project, canonicalTasks)
    : getProjectStatusLabel(project.status);
  const overdue = getProjectOverdueTasks(canonicalTasks).length;
  const blocked = taskDataAvailable ? getProjectBlockedTasks(canonicalTasks).length : 0;
  const health = taskDataAvailable ? getProjectHealthState(project, canonicalTasks) : null;
  const healthLabel = health ? getProjectHealthLabel(health) : attention;
  const deadline = getProjectDeadlineSummary(project);
  const next = taskDataAvailable ? getProjectNextAction(canonicalTasks) : null;
  const open = canonicalTasks.filter((task) => !task.completed).length;
  const subdued = ["completed", "archived"].includes(project.status.toLowerCase());
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir projeto ${project.title}. ${healthLabel}`}
      onPress={() => router.push(`/projects/${project.id}`)}
      style={({ pressed }) => [styles.card, subdued && styles.subdued, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <Text numberOfLines={2} style={styles.cardTitle}>
          {project.title}
        </Text>
        <Text accessibilityLabel={`Situação: ${healthLabel}`} style={styles.status}>
          {healthLabel}
        </Text>
      </View>
      {project.objective || project.description ? (
        <Text numberOfLines={2} style={styles.copy}>
          {project.objective || project.description}
        </Text>
      ) : null}
      {next ? (
        <View style={styles.nextBlock}>
          <Text style={styles.eyebrow}>PRÓXIMO PASSO</Text>
          <Text numberOfLines={2} style={styles.nextTitle}>
            {next.title}
          </Text>
        </View>
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
            {blocked ? (
              <Text style={styles.overdue}>
                {blocked} {blocked === 1 ? "bloqueada" : "bloqueadas"}
              </Text>
            ) : null}
          </View>
        </View>
      ) : taskDataAvailable ? (
        <Text style={styles.meta}>Sem tarefas vinculadas</Text>
      ) : (
        <Text style={styles.meta}>Progresso e próxima ação indisponíveis.</Text>
      )}
      <View style={styles.cardFooter}>
        <Text
          style={[styles.meta, getProjectDeadlineState(project) === "overdue" && styles.overdue]}
        >
          {deadline
            ? deadline.label
            : `${open} ${open === 1 ? "tarefa aberta" : "tarefas abertas"}`}
        </Text>
        <Text style={styles.continue}>{next ? "Agir agora →" : "Abrir workspace →"}</Text>
      </View>
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
  const [dueDate, setDueDate] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const submitting = useRef(false);
  const grouped = useMemo(() => groupTasksByProject(tasksQuery.data ?? []), [tasksQuery.data]);
  const projects = useMemo(
    () => sortProjectsByAttention(projectsQuery.data ?? [], grouped),
    [projectsQuery.data, grouped],
  );
  async function save() {
    if (submitting.current || createProject.isPending) return;
    submitting.current = true;
    try {
      const id = await createProject.mutateAsync({
        title,
        objective: description,
        dueDate: dueDate || null,
      });
      if (!id) throw new Error("Projeto sem identificação canônica.");
      setOpen(false);
      setTitle("");
      setDescription("");
      setDueDate("");
      router.push(`/projects/${id}`);
    } catch {
      /* The modal preserves input and presents a safe error. */
    } finally {
      submitting.current = false;
    }
  }
  async function refresh() {
    setRefreshing(true);
    await Promise.allSettled([projectsQuery.refetch(), tasksQuery.refetch()]);
    setRefreshing(false);
  }
  if (projectsQuery.isPending) return <LoadingState title="Carregando projetos…" />;
  if (projectsQuery.isError)
    return (
      <ErrorState
        title="Não foi possível carregar seus projetos."
        message="Tente novamente em instantes."
        actionLabel="Tentar novamente"
        onAction={() => void refresh()}
      />
    );
  const taskDataAvailable = !tasksQuery.isError && !tasksQuery.isPending;
  const overview = taskDataAvailable ? getProjectsOverview(projects, grouped) : null;
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
      {projects.length && overview ? (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Hoje nos seus projetos</Text>
          {overview.attention ? (
            <Text style={styles.overdue}>
              {overview.attention} {overview.attention === 1 ? "precisa" : "precisam"} de atenção
            </Text>
          ) : null}
          {overview.approaching ? (
            <Text style={styles.summaryText}>
              {overview.approaching}{" "}
              {overview.approaching === 1 ? "prazo se aproxima" : "prazos se aproximam"}
            </Text>
          ) : null}
          {overview.actionable ? (
            <Text style={styles.summaryText}>
              {overview.actionable} {overview.actionable === 1 ? "ação pode" : "ações podem"}{" "}
              avançar agora
            </Text>
          ) : null}
          {!overview.attention && !overview.approaching && !overview.actionable ? (
            <Text style={styles.summaryText}>Tudo em dia por aqui.</Text>
          ) : null}
        </View>
      ) : null}
      {projects.length && tasksQuery.isError ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            Não foi possível atualizar o progresso das tarefas.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => void tasksQuery.refetch()}>
            <Text style={styles.continue}>Tentar novamente</Text>
          </Pressable>
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
            title="Transforme objetivos em progresso."
            message="Crie um projeto e organize o que precisa acontecer até a conclusão. A NEXORA acompanha tarefas, progresso e próximos passos."
            actionLabel="Criar primeiro projeto"
            onAction={() => setOpen(true)}
          />
        }
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            tasks={taskDataAvailable ? (grouped.get(item.id) ?? []) : null}
          />
        )}
      />
      <NativeFormModal
        visible={open}
        title="Novo projeto"
        placeholder="O que você quer realizar?"
        value={title}
        onChange={setTitle}
        secondaryValue={description}
        secondaryPlaceholder="Como será o resultado quando estiver concluído?"
        onSecondaryChange={setDescription}
        dateValue={dueDate}
        datePlaceholder="Adicionar prazo (opcional)"
        onDateChange={setDueDate}
        busy={createProject.isPending}
        error={createProject.error?.message ?? null}
        valueMaxLength={120}
        secondaryMaxLength={1000}
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
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  summaryTitle: { ...typography.heading, fontSize: 17, color: colors.text },
  summaryText: { ...typography.caption, color: colors.textMuted },
  warning: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  warningText: { ...typography.caption, color: colors.warning, flex: 1 },
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
  nextBlock: { gap: spacing.xs },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  nextTitle: { ...typography.label, color: colors.text },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  continue: { ...typography.label, color: colors.primaryBright },
});
