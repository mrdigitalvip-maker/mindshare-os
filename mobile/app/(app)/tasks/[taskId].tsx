import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { useProjects, useTasks, useWorkspaceMutations } from "@/hooks/use-workspaces";
import {
  buildTaskAssistantContext,
  getTaskActivity,
  getRescheduleDate,
  getTaskDuePresentation,
  getTaskNudge,
  getTaskPriorityLabel,
  getTaskProgressSummary,
  getTaskRhythmState,
  getTaskWorkState,
} from "@/lib/task-selectors";
import { getProjectHealthState } from "@/lib/project-selectors";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { cancelTaskReminder, scheduleTaskReminder } from "@/services/notification-service";
import type { Task } from "@/services/workspace-service";

const stateLabel = {
  not_started: "Não iniciada",
  in_progress: "Em andamento",
  blocked: "Bloqueada",
  completed: "Concluída",
};

export default function TaskWorkspace() {
  const { taskId = "" } = useLocalSearchParams<{ taskId: string }>();
  const tasks = useTasks();
  const projects = useProjects();
  const { mutateTask } = useWorkspaceMutations();
  const task = tasks.data?.find(({ id }) => id === taskId);
  const project = projects.data?.find(({ id }) => id === task?.projectId);
  const projectTasks = useMemo(
    () => (tasks.data ?? []).filter(({ projectId }) => projectId === task?.projectId),
    [task?.projectId, tasks.data],
  );
  const [nextAction, setNextAction] = useState<string | null>(null);
  const [blocker, setBlocker] = useState<string | null>(null);
  const [editingNext, setEditingNext] = useState(false);
  const [editingBlocker, setEditingBlocker] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState("");
  if (tasks.isPending) return <LoadingState title="Preparando espaço de execução…" />;
  if (tasks.isError)
    return (
      <ErrorState
        title="Não foi possível carregar esta tarefa."
        actionLabel="Tentar novamente"
        onAction={() => void tasks.refetch()}
      />
    );
  if (!task)
    return (
      <ErrorState
        title="Tarefa não encontrada."
        actionLabel="Voltar"
        onAction={() => router.back()}
      />
    );
  const workState = getTaskWorkState(task);
  const rhythm = getTaskRhythmState(task);
  const progressSummary = getTaskProgressSummary(task);
  const activity = getTaskActivity(task);
  const draftNext = nextAction ?? task.nextAction ?? "";
  const draftBlocker = blocker ?? task.blockerNote ?? "";

  async function update(patch: Partial<Task>) {
    setError("");
    try {
      await mutateTask.mutateAsync({
        action: "update",
        taskId: task!.id,
        projectId: task!.projectId,
        patch,
      });
    } catch {
      setError("Não foi possível salvar a alteração. Tente novamente.");
      throw new Error("mutation");
    }
  }
  const start = () =>
    void update({
      executionStatus: "in_progress",
      startedAt: task.startedAt ?? new Date().toISOString(),
      lastProgressAt: new Date().toISOString(),
    });
  const complete = () =>
    void update({
      completed: true,
      executionStatus: "completed",
      lastProgressAt: new Date().toISOString(),
      reminderAt: null,
    })
      .then(() => cancelTaskReminder(task.id))
      .then(() =>
        Alert.alert(
          "Concluída.",
          project ? `Esta etapa avançou o projeto ${project.title}.` : undefined,
        ),
      )
      .catch(() => undefined);
  const reopen = () =>
    void update({ completed: false, executionStatus: "in_progress", reminderAt: null }).catch(
      () => undefined,
    );
  const registerProgress = (state: "progressed" | "unchanged" | "blocked") => {
    if (state === "unchanged") {
      setCheckingIn(false);
      Alert.alert("Sem mudança", "Nenhum progresso foi registrado.");
      return;
    }
    const patch: Partial<Task> =
      state === "progressed"
        ? {
            executionStatus: "in_progress",
            lastProgressAt: new Date().toISOString(),
            blockerNote: null,
          }
        : { executionStatus: "blocked" };
    void update(patch)
      .then(() => setCheckingIn(false))
      .catch(() => undefined);
  };
  const saveNext = () =>
    void update({ nextAction: draftNext })
      .then(() => {
        setEditingNext(false);
        setNextAction(null);
      })
      .catch(() => undefined);
  const saveBlocker = () =>
    void update({
      blockerNote: draftBlocker,
      executionStatus: draftBlocker.trim() ? "blocked" : "in_progress",
      lastProgressAt: new Date().toISOString(),
    })
      .then(() => {
        setEditingBlocker(false);
        setBlocker(null);
      })
      .catch(() => undefined);
  function remind() {
    const apply = async (hours: number) => {
      const at = new Date(Date.now() + hours * 3_600_000).toISOString();
      try {
        const result = await scheduleTaskReminder(task!, at);
        if (!result.scheduled)
          return Alert.alert(
            "Notificações desativadas",
            "Ative as notificações nas configurações do Android para usar lembretes.",
          );
        await update({ reminderAt: at });
        Alert.alert("Lembrete definido", "A NEXORA lembrará você no horário escolhido.");
      } catch {
        setError("Não foi possível agendar o lembrete.");
      }
    };
    Alert.alert("Adiar lembrete", "O prazo da tarefa não será alterado.", [
      { text: "Mais tarde hoje", onPress: () => void apply(3) },
      { text: "Amanhã", onPress: () => void apply(24) },
      { text: "Próxima semana", onPress: () => void apply(168) },
      { text: "Cancelar", style: "cancel" },
    ]);
  }
  function cancelReminder() {
    void cancelTaskReminder(task!.id)
      .then(() => update({ reminderAt: null }))
      .catch(() => setError("Não foi possível cancelar o lembrete."));
  }
  function changeDeadline() {
    const apply = (option: "tomorrow" | "next-week") =>
      void update({ dueDate: getRescheduleDate(option) }).catch(() => undefined);
    Alert.alert("Mudar prazo", "Esta ação altera o prazo real da tarefa.", [
      { text: "Amanhã", onPress: () => apply("tomorrow") },
      { text: "Próxima semana", onPress: () => apply("next-week") },
      { text: "Cancelar", style: "cancel" },
    ]);
  }
  const helpPrompt = buildTaskAssistantContext(task, project);
  const completedCount = projectTasks.filter(({ completed }) => completed).length;
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹ Tarefas</Text>
          </Pressable>
          <Text style={styles.title}>{task.title}</Text>
          {task.description ? <Text style={styles.description}>{task.description}</Text> : null}
          <Text style={styles.meta}>
            {project?.title ?? "Sem projeto"} · {getTaskPriorityLabel(task.priority)} ·{" "}
            {getTaskDuePresentation(task)}
          </Text>
          <Text style={styles.state}>{stateLabel[workState]}</Text>
          <Card label="NEXORA NOW">
            <Text style={styles.body}>{getTaskNudge(task)}</Text>
            <Text style={styles.muted}>Ritmo: {rhythm.replaceAll("_", " ")}</Text>
            {(rhythm === "stale" || rhythm === "overdue") && (
              <Button
                label="Reorganizar com a NEXORA"
                onPress={() =>
                  router.push({
                    pathname: "/assistant-chat",
                    params: { prompt: `${helpPrompt}\nQuero reorganizar esta tarefa.` },
                  })
                }
              />
            )}
          </Card>
          <Card label="PRÓXIMA AÇÃO">
            {editingNext ? (
              <>
                <TextInput
                  autoFocus
                  multiline
                  value={draftNext}
                  onChangeText={setNextAction}
                  placeholder="Ex.: escrever os três primeiros tópicos"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <Button label="Salvar próxima ação" onPress={saveNext} />
              </>
            ) : (
              <>
                <Text style={styles.body}>{task.nextAction || "Nenhuma ação definida."}</Text>
                <Button
                  label={task.nextAction ? "Editar" : "Definir próxima ação"}
                  onPress={() => setEditingNext(true)}
                />
              </>
            )}
          </Card>
          <Card label="PROGRESSO">
            <Text style={styles.body}>{stateLabel[workState]}</Text>
            {progressSummary ? <Text style={styles.muted}>{progressSummary}</Text> : null}
            <View style={styles.actions}>
              {workState === "not_started" && <Button label="Começar" onPress={start} />}
              {workState === "in_progress" && (
                <Button label="Continuar" onPress={() => setCheckingIn(true)} />
              )}
              {workState !== "completed" && (
                <Button label="Registrar progresso" onPress={() => setCheckingIn(true)} />
              )}
              {workState !== "completed" ? (
                <Button label="Concluir" onPress={complete} />
              ) : (
                <Button label="Reabrir" onPress={reopen} />
              )}
            </View>
            {checkingIn && workState !== "completed" ? (
              <View style={styles.checkIn}>
                <Text style={styles.muted}>Registre apenas o que realmente aconteceu.</Text>
                <View style={styles.actions}>
                  <Button label="Avancei" onPress={() => registerProgress("progressed")} />
                  <Button label="Sem mudança" onPress={() => registerProgress("unchanged")} />
                  <Button
                    label="Estou bloqueado"
                    onPress={() => {
                      setCheckingIn(false);
                      setEditingBlocker(true);
                    }}
                  />
                </View>
              </View>
            ) : null}
          </Card>
          <Card label="BLOQUEIO">
            {editingBlocker ? (
              <>
                <TextInput
                  autoFocus
                  multiline
                  value={draftBlocker}
                  onChangeText={setBlocker}
                  placeholder="O que impede o avanço?"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <Button label="Salvar bloqueio" onPress={saveBlocker} />
              </>
            ) : (
              <>
                <Text style={styles.body}>{task.blockerNote || "Nenhum bloqueio registrado."}</Text>
                {workState !== "completed" && (
                  <Button
                    label={task.blockerNote ? "Editar / resolver" : "Estou travado"}
                    onPress={() => setEditingBlocker(true)}
                  />
                )}
                {workState === "blocked" ? (
                  <Button
                    label="Resolver bloqueio"
                    onPress={() => {
                      setBlocker("");
                      setEditingBlocker(true);
                    }}
                  />
                ) : null}
              </>
            )}
          </Card>
          <Card label="AÇÕES">
            <Text style={styles.body}>
              {task.reminderAt
                ? `Lembrete: ${new Date(task.reminderAt).toLocaleString("pt-BR")}`
                : "Nenhum lembrete definido."}
            </Text>
            <View style={styles.actions}>
              <Button
                label={task.reminderAt ? "Alterar lembrete" : "Definir lembrete"}
                onPress={remind}
              />
              {task.reminderAt ? (
                <Button label="Cancelar lembrete" onPress={cancelReminder} />
              ) : null}
              <Button label="Mudar prazo" onPress={changeDeadline} />
              <Button
                label="Preciso de ajuda"
                onPress={() =>
                  router.push({ pathname: "/assistant-chat", params: { prompt: helpPrompt } })
                }
              />
            </View>
          </Card>
          {project && (
            <Card label="IMPACTO NO PROJETO">
              <Text style={styles.muted}>AVANÇA</Text>
              <Pressable onPress={() => router.push(`/projects/${project.id}`)}>
                <Text style={styles.projectLink}>{project.title}</Text>
              </Pressable>
              <Text style={styles.muted}>
                {completedCount} de {projectTasks.length} etapas concluídas.
              </Text>
              <Text style={styles.muted}>
                Saúde: {getProjectHealthState(project, projectTasks)}
              </Text>
            </Card>
          )}
          {activity.length ? (
            <Card label="ATIVIDADE VERIFICÁVEL">
              {activity.map((event) => (
                <Text key={`${event.kind}-${event.at}`} style={styles.muted}>
                  {event.kind === "started"
                    ? "Iniciada"
                    : event.kind === "completed"
                      ? "Concluída"
                      : "Progresso registrado"}{" "}
                  · {new Date(event.at).toLocaleString("pt-BR")}
                </Text>
              ))}
            </Card>
          ) : null}
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}
function Button({ label, onPress }: { label: string; onPress(): void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  page: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  back: { minHeight: 44, justifyContent: "center" },
  backText: { color: colors.primaryBright, ...typography.body },
  title: { color: colors.text, ...typography.title, fontSize: 28 },
  description: { color: colors.text, ...typography.body, lineHeight: 24 },
  meta: { color: colors.textMuted, ...typography.caption },
  state: {
    alignSelf: "flex-start",
    color: colors.primaryBright,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...typography.caption,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    color: colors.primaryBright,
    ...typography.caption,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  body: { color: colors.text, ...typography.body },
  muted: { color: colors.textMuted, ...typography.caption },
  projectLink: { color: colors.primaryBright, ...typography.body, fontWeight: "700" },
  checkIn: { gap: spacing.sm, paddingTop: spacing.sm },
  input: {
    minHeight: 72,
    color: colors.text,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    textAlignVertical: "top",
    ...typography.body,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  button: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
  },
  buttonText: { color: colors.primaryBright, ...typography.caption, fontWeight: "700" },
  error: { color: colors.danger, ...typography.body },
});
