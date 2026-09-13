import { useMemo, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { NativeFormModal } from "@/components/native-form-modal";
import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { V2Progress } from "@/components/v2/premium-ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import {
  useOpenProject,
  useProjects,
  useTasks,
  useWorkspaceMutations,
} from "@/hooks/use-workspaces";
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
import { colors, radius, shadows, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";
import type { Project, Task } from "@/services/workspace-service";

const copy = {
  "pt-BR": {
    title: "Projetos",
    subtitle: "Transforme objetivos em sistemas que avançam.",
    newProject: "+ Novo",
    operating: "PROJECT OPERATING SYSTEM",
    active: "ativos",
    attention: "atenção",
    actionable: "ações agora",
    approaching: "prazos próximos",
    intelligence: "INTELIGÊNCIA KIVRYN",
    intelligenceCopy: "A KIVRYN lê tarefas, bloqueios, prazos e progresso para dizer onde agir primeiro.",
    prioritize: "Priorizar meus projetos",
    plan: "Planejar projeto com IA",
    workspace: "WORKSPACES",
    nextAction: "PRÓXIMA AÇÃO",
    actNow: "Agir agora →",
    openWorkspace: "Abrir workspace →",
    noTasks: "Sem tarefas ainda",
    taskUnavailable: "As tarefas não puderam ser atualizadas. Os projetos continuam disponíveis.",
    retry: "Tentar novamente",
    system: "SISTEMA VIVO",
    systemCopy: "Projetos alimentam Tarefas, Dashboard e KIVRYN Core. Alterações aparecem em todo o sistema.",
    connections: "CONEXÕES",
    connectionsCopy: "Google Calendar e Drive entram aqui para prazos, arquivos e contexto do projeto assim que o Connections Hub estiver ativo.",
  },
  en: {
    title: "Projects",
    subtitle: "Turn goals into systems that keep moving.",
    newProject: "+ New",
    operating: "PROJECT OPERATING SYSTEM",
    active: "active",
    attention: "attention",
    actionable: "actions now",
    approaching: "deadlines near",
    intelligence: "KIVRYN INTELLIGENCE",
    intelligenceCopy: "KIVRYN reads tasks, blockers, deadlines and progress to tell you where to act first.",
    prioritize: "Prioritize my projects",
    plan: "Plan project with AI",
    workspace: "WORKSPACES",
    nextAction: "NEXT ACTION",
    actNow: "Act now →",
    openWorkspace: "Open workspace →",
    noTasks: "No tasks yet",
    taskUnavailable: "Tasks could not be refreshed. Your projects are still available.",
    retry: "Try again",
    system: "LIVE SYSTEM",
    systemCopy: "Projects feed Tasks, Dashboard and KIVRYN Core. Changes propagate across the system.",
    connections: "CONNECTIONS",
    connectionsCopy: "Google Calendar and Drive plug in here for deadlines, files and project context once Connections Hub is active.",
  },
} as const;

function Metric({ value, label, danger }: { value: number; label: string; danger?: boolean }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, danger && styles.metricDanger]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ProjectCard({
  project,
  tasks,
  onOpen,
  nextLabel,
  actNow,
  openWorkspace,
  noTasks,
}: {
  project: Project;
  tasks: Task[] | null;
  onOpen: (projectId: string) => void;
  nextLabel: string;
  actNow: string;
  openWorkspace: string;
  noTasks: string;
}) {
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
  const percentage = progress ? Math.round(progress.ratio * 100) : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir projeto ${project.title}. ${healthLabel}`}
      onPress={() => {
        onOpen(project.id);
        router.push(`/projects/${project.id}`);
      }}
      style={({ pressed }) => [styles.card, subdued && styles.subdued, pressed && styles.pressed]}
    >
      <View style={styles.cardGlow} />
      <View style={styles.cardTop}>
        <View style={styles.cardIdentity}>
          <View style={styles.projectGlyph}>
            <Text style={styles.projectGlyphText}>◇</Text>
          </View>
          <View style={styles.flex}>
            <Text numberOfLines={2} style={styles.cardTitle}>{project.title}</Text>
            <Text style={styles.statusText}>{healthLabel}</Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>

      {project.objective || project.description ? (
        <Text numberOfLines={2} style={styles.copy}>{project.objective || project.description}</Text>
      ) : null}

      {next ? (
        <View style={styles.nextBlock}>
          <Text style={styles.eyebrow}>{nextLabel}</Text>
          <Text numberOfLines={2} style={styles.nextTitle}>{next.title}</Text>
        </View>
      ) : taskDataAvailable ? (
        <Text style={styles.meta}>{noTasks}</Text>
      ) : null}

      {progress ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressTop}>
            <Text style={styles.progressCopy}>{progress.completed}/{progress.total} tarefas</Text>
            <Text style={styles.progressPercent}>{percentage}%</Text>
          </View>
          <V2Progress value={percentage} label={`${progress.completed} de ${progress.total} tarefas concluídas`} />
          <View style={styles.signalRow}>
            <Text style={styles.signal}>{open} abertas</Text>
            {overdue ? <Text style={[styles.signal, styles.danger]}>{overdue} atrasadas</Text> : null}
            {blocked ? <Text style={[styles.signal, styles.warning]}>{blocked} bloqueadas</Text> : null}
          </View>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={[styles.meta, getProjectDeadlineState(project) === "overdue" && styles.danger]}>
          {deadline ? deadline.label : `${open} ${open === 1 ? "tarefa aberta" : "tarefas abertas"}`}
        </Text>
        <Text style={styles.continue}>{next ? actNow : openWorkspace}</Text>
      </View>
    </Pressable>
  );
}

export default function Projetos() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const prefetchProject = useOpenProject();
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
      // Preserve user input for safe retry.
    } finally {
      submitting.current = false;
    }
  }

  async function refresh() {
    setRefreshing(true);
    await Promise.allSettled([projectsQuery.refetch(), tasksQuery.refetch()]);
    setRefreshing(false);
  }

  function askKivryn(prompt: string) {
    router.push({ pathname: "/assistant-chat", params: { prompt } });
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
  const activeCount = projects.filter((project) => !["completed", "archived"].includes(project.status.toLowerCase())).length;

  return (
    <AppScreen contentContainerStyle={styles.page}>
      <StandardHeader
        title={text.title}
        subtitle={text.subtitle}
        action={
          <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.add}>
            <Text style={styles.addText}>{text.newProject}</Text>
          </Pressable>
        }
      />

      <FlatList
        data={projects}
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
        contentContainerStyle={projects.length ? styles.list : styles.empty}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <View style={styles.commandCard}>
              <View style={styles.commandGlowA} />
              <View style={styles.commandGlowB} />
              <Text style={styles.commandEyebrow}>{text.operating}</Text>
              <View style={styles.metricsRow}>
                <Metric value={activeCount} label={text.active} />
                <View style={styles.metricDivider} />
                <Metric value={overview?.attention ?? 0} label={text.attention} danger={Boolean(overview?.attention)} />
                <View style={styles.metricDivider} />
                <Metric value={overview?.actionable ?? 0} label={text.actionable} />
              </View>
              {overview?.approaching ? (
                <View style={styles.deadlineStrip}>
                  <Text style={styles.deadlineDot}>●</Text>
                  <Text style={styles.deadlineCopy}>{overview.approaching} {text.approaching}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.aiCard}>
              <View style={styles.aiIcon}><Text style={styles.aiSpark}>✦</Text></View>
              <View style={styles.flex}>
                <Text style={styles.aiEyebrow}>{text.intelligence}</Text>
                <Text style={styles.aiCopy}>{text.intelligenceCopy}</Text>
              </View>
              <View style={styles.aiActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => askKivryn("Analise meus projetos atuais e diga qual devo priorizar agora, considerando prazos, bloqueios e próximas ações.")}
                  style={styles.primaryPill}
                >
                  <Text style={styles.primaryPillText}>{text.prioritize}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => askKivryn("Quero criar um projeto novo. Me ajude a definir objetivo, prazo e primeiras tarefas antes de propor a criação.")}
                  style={styles.secondaryPill}
                >
                  <Text style={styles.secondaryPillText}>{text.plan}</Text>
                </Pressable>
              </View>
            </View>

            {tasksQuery.isError ? (
              <View style={styles.warningCard}>
                <Text style={styles.warningCopy}>{text.taskUnavailable}</Text>
                <Pressable onPress={() => void tasksQuery.refetch()}><Text style={styles.link}>{text.retry}</Text></Pressable>
              </View>
            ) : null}

            <View style={styles.systemCard}>
              <Text style={styles.systemEyebrow}>{text.system}</Text>
              <Text style={styles.systemCopy}>{text.systemCopy}</Text>
            </View>

            <View style={styles.connectionsCard}>
              <View style={styles.connectionIcon}><Text style={styles.connectionIconText}>↗</Text></View>
              <View style={styles.flex}>
                <Text style={styles.systemEyebrow}>{text.connections}</Text>
                <Text style={styles.systemCopy}>{text.connectionsCopy}</Text>
              </View>
            </View>

            {projects.length ? <Text style={styles.sectionTitle}>{text.workspace}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Transforme objetivos em progresso."
            message="Crie um projeto e organize o que precisa acontecer até a conclusão. A KIVRYN acompanha tarefas, progresso, bloqueios e próximos passos."
            actionLabel="Criar primeiro projeto"
            onAction={() => setOpen(true)}
          />
        }
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            tasks={taskDataAvailable ? (grouped.get(item.id) ?? []) : null}
            onOpen={prefetchProject}
            nextLabel={text.nextAction}
            actNow={text.actNow}
            openWorkspace={text.openWorkspace}
            noTasks={text.noTasks}
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
  flex: { flex: 1, minWidth: 0 },
  add: { minHeight: 42, justifyContent: "center", paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.primaryBright },
  addText: { ...typography.label, color: "#001116", fontWeight: "800" },
  list: { gap: 12, paddingBottom: 110 },
  empty: { flexGrow: 1 },
  headerStack: { gap: 14, paddingBottom: 18 },
  commandCard: { position: "relative", overflow: "hidden", padding: 18, borderRadius: 24, borderWidth: 1, borderColor: "rgba(82,229,255,0.16)", backgroundColor: "#07101A", ...shadows.raised },
  commandGlowA: { position: "absolute", width: 170, height: 170, borderRadius: 85, right: -70, top: -95, backgroundColor: "rgba(0,184,217,0.10)" },
  commandGlowB: { position: "absolute", width: 130, height: 130, borderRadius: 65, left: -75, bottom: -90, backgroundColor: "rgba(139,124,246,0.08)" },
  commandEyebrow: { ...typography.eyebrow, color: colors.primaryBright, letterSpacing: 1.7 },
  metricsRow: { flexDirection: "row", alignItems: "center", marginTop: 18 },
  metric: { flex: 1 },
  metricValue: { ...typography.title, color: colors.text, fontSize: 30, lineHeight: 34 },
  metricDanger: { color: colors.danger },
  metricLabel: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  metricDivider: { width: 1, height: 38, backgroundColor: colors.border, marginHorizontal: 10 },
  deadlineStrip: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  deadlineDot: { color: colors.warning, fontSize: 9 },
  deadlineCopy: { ...typography.caption, color: colors.textSecondary },
  aiCard: { gap: 12, padding: 16, borderRadius: 22, borderWidth: 1, borderColor: "rgba(82,229,255,0.14)", backgroundColor: colors.surface },
  aiIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "rgba(82,229,255,0.08)" },
  aiSpark: { color: colors.primaryBright, fontSize: 20 },
  aiEyebrow: { ...typography.eyebrow, color: colors.primaryBright, letterSpacing: 1.4 },
  aiCopy: { ...typography.body, color: colors.textSecondary, marginTop: 4, lineHeight: 20 },
  aiActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primaryPill: { minHeight: 42, justifyContent: "center", paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.primaryBright },
  primaryPillText: { ...typography.caption, color: "#001116", fontWeight: "800" },
  secondaryPill: { minHeight: 42, justifyContent: "center", paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
  secondaryPillText: { ...typography.caption, color: colors.text },
  warningCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.surfaceRaised },
  warningCopy: { ...typography.caption, color: colors.warning, flex: 1 },
  link: { ...typography.label, color: colors.primaryBright },
  systemCard: { padding: 15, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  systemEyebrow: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: 1.5 },
  systemCopy: { ...typography.caption, color: colors.textSecondary, marginTop: 5, lineHeight: 18 },
  connectionsCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  connectionIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.surfaceRaised },
  connectionIconText: { color: colors.primaryBright, fontSize: 18 },
  sectionTitle: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: 1.7, marginTop: 4 },
  card: { position: "relative", overflow: "hidden", gap: 12, padding: 16, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  cardGlow: { position: "absolute", width: 120, height: 120, borderRadius: 60, right: -70, top: -65, backgroundColor: "rgba(82,229,255,0.035)" },
  subdued: { opacity: 0.66 },
  pressed: { opacity: 0.76 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 11 },
  projectGlyph: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colors.surfaceRaised },
  projectGlyphText: { color: colors.primaryBright, fontSize: 21 },
  cardTitle: { ...typography.heading, fontSize: 18, lineHeight: 23, color: colors.text },
  statusText: { ...typography.caption, color: colors.primaryBright, marginTop: 2 },
  chevron: { color: colors.textMuted, fontSize: 26 },
  copy: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  nextBlock: { gap: 4, padding: 12, borderRadius: 14, backgroundColor: colors.surfaceRaised },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright, letterSpacing: 1.2 },
  nextTitle: { ...typography.label, color: colors.text },
  progressBlock: { gap: 8 },
  progressTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  progressCopy: { ...typography.caption, color: colors.textMuted },
  progressPercent: { ...typography.caption, color: colors.primaryBright, fontWeight: "800" },
  signalRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  signal: { ...typography.caption, color: colors.textMuted },
  danger: { color: colors.danger },
  warning: { color: colors.warning },
  meta: { ...typography.caption, color: colors.textMuted },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  continue: { ...typography.label, color: colors.primaryBright },
});
