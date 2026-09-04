import { useRef, useState } from "react";
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
import { NativeFormModal } from "@/components/native-form-modal";
import { useProject, useProjects, useTask, useWorkspaceMutations } from "@/hooks/use-workspaces";
import {
  buildTaskAssistantContext,
  getTaskActivity,
  getRescheduleDate,
  getTaskDuePresentation,
  getTaskNudge,
  getTaskPriorityLabel,
  getTaskProgressSummary,
  getTaskRhythmState,
  getTaskRhythmLabel,
  getTaskWorkState,
} from "@/lib/task-selectors";
import { getProjectHealthLabel, getProjectHealthState } from "@/lib/project-selectors";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { cancelTaskReminder, scheduleTaskReminder } from "@/services/notification-service";
import type { Task } from "@/services/workspace-service";
import { useLanguage } from "@/providers/language-provider";

const stateLabel = {
  not_started: "Não iniciada",
  in_progress: "Em andamento",
  blocked: "Bloqueada",
  completed: "Concluída",
};

export default function TaskWorkspace() {
  const { resolvedLocale } = useLanguage();
  const { taskId = "" } = useLocalSearchParams<{ taskId: string }>();
  const taskQuery = useTask(taskId);
  const projects = useProjects();
  const { mutateTask } = useWorkspaceMutations();
  // Runtime null is still handled below; the assertion keeps event-handler closures narrowed.
  const task = taskQuery.data!;
  const projectQuery = useProject(task?.projectId ?? "");
  const project = projectQuery.data?.project;
  const projectTasks = projectQuery.data?.tasks ?? [];
  const [nextAction, setNextAction] = useState<string | null>(null);
  const [blocker, setBlocker] = useState<string | null>(null);
  const [editingNext, setEditingNext] = useState(false);
  const [editingBlocker, setEditingBlocker] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState("");
  const [editingTask, setEditingTask] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const operationGuards = useRef(new Set<string>());
  if (!taskId.trim())
    return (
      <ErrorState title="Tarefa inválida." actionLabel="Voltar" onAction={() => router.back()} />
    );
  if (taskQuery.isPending) return <LoadingState title="Preparando espaço de execução…" />;
  if (taskQuery.isError)
    return (
      <ErrorState
        title="Não foi possível carregar esta tarefa."
        actionLabel="Tentar novamente"
        onAction={() => void taskQuery.refetch()}
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

  async function update(patch: Partial<Task>, operation = "update") {
    if (operationGuards.current.has(operation) || mutateTask.isPending) return false;
    operationGuards.current.add(operation);
    setError("");
    try {
      await mutateTask.mutateAsync({
        action: "update",
        taskId: task!.id,
        projectId: task!.projectId,
        patch,
      });
      return true;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar a alteração. Tente novamente.",
      );
      throw caught;
    } finally {
      operationGuards.current.delete(operation);
    }
  }
  const start = () =>
    void update(
      {
        executionStatus: "in_progress",
        startedAt: task.startedAt ?? new Date().toISOString(),
      },
      "start",
    );
  const complete = () =>
    void update(
      {
        completed: true,
        executionStatus: "completed",
        reminderAt: null,
      },
      "complete",
    )
      .then(async (saved) => {
        if (!saved) return;
        await cancelTaskReminder(task.id);
        Alert.alert(
          "Concluída.",
          project ? `Esta etapa avançou o projeto ${project.title}.` : undefined,
        );
      })
      .catch(() => undefined);
  const reopen = () =>
    void update(
      {
        completed: false,
        executionStatus: task.startedAt ? "in_progress" : "not_started",
        reminderAt: null,
      },
      "reopen",
    ).catch(() => undefined);
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
    void update(patch, "progress")
      .then(() => setCheckingIn(false))
      .catch(() => undefined);
  };
  const saveNext = () =>
    void update({ nextAction: draftNext }, "next-action")
      .then(() => {
        setEditingNext(false);
        setNextAction(null);
      })
      .catch(() => undefined);
  const saveBlocker = () =>
    !draftBlocker.trim()
      ? setError("Explique o bloqueio antes de salvar.")
      : void update(
          {
            blockerNote: draftBlocker,
            executionStatus: "blocked",
          },
          "blocker",
        )
          .then(() => {
            setEditingBlocker(false);
            setBlocker(null);
          })
          .catch(() => undefined);
  function remind() {
    const currentTask = task;
    const apply = async (hours: number) => {
      const at = new Date(Date.now() + hours * 3_600_000).toISOString();
      try {
        const result = await scheduleTaskReminder(currentTask, at, resolvedLocale);
        if (!result.scheduled)
          return Alert.alert(
            "Notificações desativadas",
            "Ative as notificações nas configurações do Android para usar lembretes.",
          );
        try {
          await update({ reminderAt: at }, "reminder-create");
        } catch (persistError) {
          await cancelTaskReminder(currentTask.id).catch(() => undefined);
          throw persistError;
        }
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
    void update({ reminderAt: null }, "reminder-cancel")
      .then(async (saved) => {
        if (saved) await cancelTaskReminder(task!.id);
      })
      .catch(() => setError("Não foi possível cancelar o lembrete."));
  }
  function changeDeadline() {
    const apply = (option: "tomorrow" | "next-week") =>
      void update({ dueDate: getRescheduleDate(option) }, "deadline").catch(() => undefined);
    Alert.alert("Mudar prazo", "Esta ação altera o prazo real da tarefa.", [
      { text: "Amanhã", onPress: () => apply("tomorrow") },
      { text: "Próxima semana", onPress: () => apply("next-week") },
      { text: "Cancelar", style: "cancel" },
    ]);
  }
  function openTaskEditor() {
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditDueDate(task.dueDate ?? "");
    setEditPriority(task.priority);
    setEditProjectId(task.projectId);
    setEditingTask(true);
  }
  async function saveTaskEditor() {
    const unchanged =
      editTitle.trim() === task.title &&
      editDescription.trim() === task.description &&
      (editDueDate || null) === task.dueDate &&
      editPriority === task.priority &&
      editProjectId === task.projectId;
    if (unchanged) return setEditingTask(false);
    try {
      await mutateTask.mutateAsync({
        action: "update",
        taskId: task.id,
        projectId: editProjectId,
        previousProjectId: task.projectId,
        patch: {
          title: editTitle,
          description: editDescription,
          dueDate: editDueDate || null,
          priority: editPriority,
          projectId: editProjectId,
        },
      });
      setEditingTask(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível editar a tarefa.");
    }
  }
  function deleteTask() {
    Alert.alert("Excluir tarefa?", "Esta ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          if (operationGuards.current.has("delete")) return;
          operationGuards.current.add("delete");
          void mutateTask
            .mutateAsync({ action: "delete", taskId: task.id, projectId: task.projectId })
            .then(async () => {
              await cancelTaskReminder(task.id);
              router.back();
            })
            .catch((caught) =>
              setError(
                caught instanceof Error ? caught.message : "Não foi possível excluir a tarefa.",
              ),
            )
            .finally(() => operationGuards.current.delete("delete"));
        },
      },
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
            {task.projectId == null
              ? "Sem projeto"
              : project
                ? project.title
                : projectQuery.isPending
                  ? "Projeto vinculado…"
                  : "Projeto vinculado indisponível"}{" "}
            · {getTaskPriorityLabel(task.priority)} · {getTaskDuePresentation(task)}
          </Text>
          <Text style={styles.state}>{stateLabel[workState]}</Text>
          <Card label="NEXORA AGORA">
            <Text style={styles.body}>{getTaskNudge(task)}</Text>
            <Text style={styles.muted}>Ritmo: {getTaskRhythmLabel(rhythm)}</Text>
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
                <Text style={styles.body}>
                  {task.nextAction || "Nenhuma próxima ação definida."}
                </Text>
                <Button
                  label={task.nextAction ? "Editar" : "Definir próxima ação"}
                  onPress={() => setEditingNext(true)}
                />
              </>
            )}
          </Card>
          <Card label="EXECUÇÃO E PROGRESSO">
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
                    onPress={() =>
                      void update(
                        {
                          blockerNote: null,
                          executionStatus: task.startedAt ? "in_progress" : "not_started",
                        },
                        "clear-blocker",
                      ).catch(() => undefined)
                    }
                  />
                ) : null}
                <Button
                  label="Pedir ajuda à NEXORA"
                  onPress={() =>
                    router.push({
                      pathname: "/assistant-chat",
                      params: { prompt: `${helpPrompt}\nAjude-me a resolver este bloqueio.` },
                    })
                  }
                />
              </>
            )}
          </Card>
          <Card label="PRAZO E LEMBRETE">
            <Text style={styles.body}>
              {task.reminderAt && new Date(task.reminderAt) > new Date()
                ? `Lembrete: ${new Date(task.reminderAt).toLocaleString("pt-BR")}`
                : "Nenhum lembrete definido."}
            </Text>
            <Text style={styles.muted}>
              O lembrete avisa você; o prazo continua sendo {getTaskDuePresentation(task)}.
            </Text>
            <View style={styles.actions}>
              <Button
                label={task.reminderAt ? "Alterar lembrete" : "Definir lembrete"}
                onPress={remind}
              />
              {task.reminderAt && new Date(task.reminderAt) > new Date() ? (
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
          {projectQuery.isError ? (
            <Card label="IMPACTO NO PROJETO">
              <Text style={styles.muted}>Não foi possível carregar o projeto vinculado.</Text>
              <Button label="Tentar novamente" onPress={() => void projectQuery.refetch()} />
            </Card>
          ) : null}
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
                Saúde: {getProjectHealthLabel(getProjectHealthState(project, projectTasks))}
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
          <Card label="GERENCIAR TAREFA">
            <Button label="Editar tarefa" onPress={openTaskEditor} />
            <Button label="Excluir tarefa" onPress={deleteTask} />
          </Card>
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
        </ScrollView>
        <NativeFormModal
          visible={editingTask}
          title="Editar tarefa"
          placeholder="Título da tarefa"
          value={editTitle}
          secondaryValue={editDescription}
          secondaryPlaceholder="Descrição (opcional)"
          dateValue={editDueDate}
          datePlaceholder="Prazo (opcional)"
          busy={mutateTask.isPending}
          error={error}
          valueMaxLength={160}
          secondaryMaxLength={2000}
          onChange={setEditTitle}
          onSecondaryChange={setEditDescription}
          onDateChange={setEditDueDate}
          onClose={() => setEditingTask(false)}
          onSave={() => void saveTaskEditor()}
        >
          <View style={styles.actions}>
            {(["high", "medium", "low"] as const).map((value) => (
              <Button
                key={value}
                label={getTaskPriorityLabel(value)}
                onPress={() => setEditPriority(value)}
              />
            ))}
          </View>
          <View style={styles.actions}>
            <Button label="Sem projeto" onPress={() => setEditProjectId(null)} />
            {(projects.data ?? []).map((item) => (
              <Button key={item.id} label={item.title} onPress={() => setEditProjectId(item.id)} />
            ))}
          </View>
        </NativeFormModal>
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
