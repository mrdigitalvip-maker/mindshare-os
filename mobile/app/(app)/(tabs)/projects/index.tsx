import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { NativeFormModal } from "@/components/native-form-modal";
import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import {
  useOpenProject,
  useProjects,
  useTasks,
  useWorkspaceMutations,
} from "@/hooks/use-workspaces";
import { groupTasksByProject } from "@/lib/project-selectors";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";
import type { Project, Task } from "@/services/workspace-service";

type ProjectFilter = "all" | "active" | "completed";

const copy = {
  "pt-BR": {
    title: "Projetos",
    subtitle: "Objetivos, tarefas e progresso em um só lugar.",
    all: "Tudo",
    active: "Ativos",
    completed: "Concluídos",
    search: "Pesquisar projetos",
    noResults: "Nenhum projeto corresponde a este filtro.",
    noProjects: "Comece com um projeto",
    noProjectsCopy: "Dê um nome ao objetivo e concentre tarefas, prazo e progresso em um só lugar.",
    createFirst: "Criar projeto",
    noTasks: "Sem tarefas",
    tasks: "tarefas",
    done: "concluídas",
    completedLabel: "Concluído",
    taskUnavailable: "As tarefas não puderam ser atualizadas. Seus projetos continuam disponíveis.",
    newProject: "Novo projeto",
    namePlaceholder: "Nome do projeto",
    objectivePlaceholder: "Como será quando estiver concluído?",
    duePlaceholder: "Adicionar prazo (opcional)",
    createError: "Não foi possível criar o projeto.",
  },
  en: {
    title: "Projects",
    subtitle: "Goals, tasks and progress in one place.",
    all: "All",
    active: "Active",
    completed: "Completed",
    search: "Search projects",
    noResults: "No project matches this filter.",
    noProjects: "Start with a project",
    noProjectsCopy: "Name the goal and keep tasks, deadline and progress in one place.",
    createFirst: "Create project",
    noTasks: "No tasks",
    tasks: "tasks",
    done: "done",
    completedLabel: "Completed",
    taskUnavailable: "Tasks could not be refreshed. Your projects are still available.",
    newProject: "New project",
    namePlaceholder: "Project name",
    objectivePlaceholder: "What will success look like?",
    duePlaceholder: "Add deadline (optional)",
    createError: "Could not create project.",
  },
} as const;

function ProjectRow({
  project,
  tasks,
  onOpen,
  locale,
  completedLabel,
  noTasks,
  tasksLabel,
  doneLabel,
}: {
  project: Project;
  tasks: Task[] | null;
  onOpen(projectId: string): void;
  locale: "pt-BR" | "en";
  completedLabel: string;
  noTasks: string;
  tasksLabel: string;
  doneLabel: string;
}) {
  const isCompleted = project.status.toLowerCase() === "completed";
  const completedTasks = tasks?.filter((task) => task.completed).length ?? 0;
  const totalTasks = tasks?.length ?? 0;
  const updated = project.updatedAt ? new Date(project.updatedAt) : null;
  const updatedLabel =
    updated && !Number.isNaN(updated.getTime())
      ? updated.toLocaleDateString(locale === "en" ? "en-US" : "pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${project.title}${isCompleted ? `, ${completedLabel}` : ""}`}
      onPress={() => {
        onOpen(project.id);
        router.push(`/projects/${project.id}`);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>▢</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.titleLine}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {project.title}
          </Text>
          {isCompleted ? <Text style={styles.statusPill}>{completedLabel}</Text> : null}
        </View>
        {project.objective || project.description ? (
          <Text numberOfLines={1} style={styles.rowDescription}>
            {project.objective || project.description}
          </Text>
        ) : null}
        <Text numberOfLines={1} style={styles.rowMeta}>
          {tasks === null
            ? updatedLabel ?? ""
            : totalTasks
              ? `${completedTasks} ${doneLabel} · ${totalTasks} ${tasksLabel}${updatedLabel ? ` · ${updatedLabel}` : ""}`
              : `${noTasks}${updatedLabel ? ` · ${updatedLabel}` : ""}`}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function Projects() {
  const { resolvedLocale } = useLanguage();
  const locale = resolvedLocale === "en" ? "en" : "pt-BR";
  const text = copy[locale];
  const prefetchProject = useOpenProject();
  const projectsQuery = useProjects();
  const tasksQuery = useTasks();
  const { createProject } = useWorkspaceMutations();
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const submitting = useRef(false);

  const grouped = useMemo(() => groupTasksByProject(tasksQuery.data ?? []), [tasksQuery.data]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (projectsQuery.data ?? []).filter((project) => {
      const status = project.status.toLowerCase();
      const completed = status === "completed";
      const matchesFilter =
        filter === "all" ||
        (filter === "completed" ? completed : !completed && status !== "archived");
      const matchesSearch =
        !needle ||
        `${project.title} ${project.objective ?? ""} ${project.description}`
          .toLowerCase()
          .includes(needle);
      return matchesFilter && matchesSearch;
    });
  }, [filter, projectsQuery.data, search]);

  async function save() {
    if (submitting.current || createProject.isPending) return;
    submitting.current = true;
    try {
      const id = await createProject.mutateAsync({
        title,
        objective,
        dueDate: dueDate || null,
      });
      if (!id) throw new Error("Projeto sem identificação canônica.");
      setOpen(false);
      setTitle("");
      setObjective("");
      setDueDate("");
      router.push(`/projects/${id}`);
    } catch {
      // Keep the form values available for correction and retry.
    } finally {
      submitting.current = false;
    }
  }

  async function refresh() {
    setRefreshing(true);
    await Promise.allSettled([projectsQuery.refetch(), tasksQuery.refetch()]);
    setRefreshing(false);
  }

  if (projectsQuery.isPending) return <LoadingState title={locale === "en" ? "Loading projects…" : "Carregando projetos…"} />;
  if (projectsQuery.isError)
    return (
      <ErrorState
        title={locale === "en" ? "Could not load your projects." : "Não foi possível carregar seus projetos."}
        message={locale === "en" ? "Try again in a moment." : "Tente novamente em instantes."}
        actionLabel={locale === "en" ? "Try again" : "Tentar novamente"}
        onAction={() => void refresh()}
      />
    );

  const taskDataAvailable = !tasksQuery.isError && !tasksQuery.isPending;
  const hasProjects = (projectsQuery.data?.length ?? 0) > 0;

  return (
    <AppScreen contentContainerStyle={styles.page}>
      <StandardHeader
        title={text.title}
        subtitle={text.subtitle}
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={text.createFirst}
            onPress={() => setOpen(true)}
            style={({ pressed }) => [styles.addButton, pressed && styles.rowPressed]}
          >
            <Text style={styles.addText}>＋</Text>
          </Pressable>
        }
      />

      <View style={styles.tabs} accessibilityRole="tablist">
        {([
          ["all", text.all],
          ["active", text.active],
          ["completed", text.completed],
        ] as const).map(([value, label]) => {
          const selected = filter === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setFilter(value)}
              style={[styles.tab, selected && styles.tabSelected]}
            >
              <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={text.search}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>

      {tasksQuery.isError && hasProjects ? (
        <Text style={styles.warning}>{text.taskUnavailable}</Text>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primaryBright}
            colors={[colors.primaryBright]}
          />
        }
        contentContainerStyle={hasProjects ? styles.list : styles.emptyList}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          hasProjects ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>{text.noResults}</Text>
            </View>
          ) : (
            <EmptyState
              title={text.noProjects}
              message={text.noProjectsCopy}
              actionLabel={text.createFirst}
              onAction={() => setOpen(true)}
            />
          )
        }
        renderItem={({ item }) => (
          <ProjectRow
            project={item}
            tasks={taskDataAvailable ? (grouped.get(item.id) ?? []) : null}
            onOpen={prefetchProject}
            locale={locale}
            completedLabel={text.completedLabel}
            noTasks={text.noTasks}
            tasksLabel={text.tasks}
            doneLabel={text.done}
          />
        )}
      />

      <NativeFormModal
        visible={open}
        title={text.newProject}
        placeholder={text.namePlaceholder}
        value={title}
        onChange={setTitle}
        secondaryValue={objective}
        secondaryPlaceholder={text.objectivePlaceholder}
        onSecondaryChange={setObjective}
        dateValue={dueDate}
        datePlaceholder={text.duePlaceholder}
        onDateChange={setDueDate}
        busy={createProject.isPending}
        error={createProject.isError ? text.createError : null}
        errorMessage={text.createError}
        valueMaxLength={120}
        secondaryMaxLength={1000}
        onSave={() => void save()}
        onClose={() => {
          if (!createProject.isPending) setOpen(false);
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: 0,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addText: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: "300",
  },
  tabs: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  tab: {
    paddingHorizontal: spacing.md,
    minHeight: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  tabSelected: {
    backgroundColor: colors.text,
  },
  tabText: {
    ...typography.label,
    color: colors.textMuted,
  },
  tabTextSelected: {
    color: colors.background,
  },
  searchBox: {
    minHeight: 50,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 25,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
    color: colors.textMuted,
    fontSize: 22,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    color: colors.text,
    fontSize: 16,
  },
  warning: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  list: {
    marginTop: spacing.md,
    paddingBottom: spacing.xxl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: spacing.xxl,
  },
  row: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  rowPressed: {
    opacity: 0.72,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
  },
  iconText: {
    color: colors.textMuted,
    fontSize: 22,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowTitle: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    color: colors.textMuted,
    backgroundColor: colors.surfaceRaised,
    fontSize: 10,
    overflow: "hidden",
  },
  rowDescription: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 14,
  },
  rowMeta: {
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 12,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 28,
    fontWeight: "300",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 76,
    backgroundColor: colors.border,
  },
  noResults: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  noResultsText: {
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 14,
  },
});
