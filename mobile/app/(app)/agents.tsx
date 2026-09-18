import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { colors, radius, spacing, typography } from "@/lib/theme";
import {
  clearMobileAgentSchedule,
  configureMobileAgentSchedule,
  listMobileAgents,
  type MobileAgent,
} from "@/services/agent-schedule-service";
import { listMobileActionHistory } from "@/services/action-history-service";
import {
  listMobilePendingAgentPlans,
  reviewMobileAgentPlan,
  runMobileAgent,
  type MobilePendingAgentPlan,
} from "@/services/agent-runtime-service";

const DAYS = [
  [1, "Seg"],
  [2, "Ter"],
  [3, "Qua"],
  [4, "Qui"],
  [5, "Sex"],
  [6, "Sáb"],
  [7, "Dom"],
] as const;

const ACTION_LABELS: Record<string, string> = {
  create_task: "Task criada",
  update_task: "Task atualizada",
  reschedule_task: "Task reagendada",
  complete_task: "Task concluída",
  set_task_next_action: "Próxima ação da Task atualizada",
  set_task_blocker: "Bloqueio da Task definido",
  clear_task_blocker: "Bloqueio da Task removido",
  create_project: "Project criado",
  update_project: "Project atualizado",
  complete_project: "Project concluído",
  add_task_to_project: "Task adicionada ao Project",
  create_study_goal: "Meta de estudo criada",
  update_study_goal: "Meta de estudo atualizada",
  set_subject_next_action: "Próxima ação de estudo atualizada",
  send_email: "Email enviado",
  create_calendar_event: "Evento criado",
  create_drive_text_file: "Arquivo criado no Drive",
};

const DOMAIN_LABELS = {
  tasks: "Tasks",
  projects: "Projects",
  studies: "Studies",
  integrations: "Integrations",
  other: "Workspace",
} as const;

export default function Agents() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["agents", "scheduled"], queryFn: listMobileAgents });
  const actionHistory = useQuery({
    queryKey: ["agents", "action-history"],
    queryFn: () => listMobileActionHistory(6),
  });
  const pendingPlans = useQuery({
    queryKey: ["agents", "pending-plans"],
    queryFn: () => listMobilePendingAgentPlans(10),
  });
  const approve = useMutation({
    mutationFn: (plan: MobilePendingAgentPlan) =>
      reviewMobileAgentPlan({
        runId: plan.runId,
        planFingerprint: plan.planFingerprint,
        decision: "approve",
        approvedStepIds: plan.plan.steps
          .map((step) => step.id)
          .filter((id) => !plan.appliedStepIds.includes(id)),
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["agents", "pending-plans"] }),
        client.invalidateQueries({ queryKey: ["agents", "action-history"] }),
        client.invalidateQueries({ queryKey: ["agents", "scheduled"] }),
      ]);
      Alert.alert("Plano aplicado", "O KIVRYN validou novamente o plano antes de aplicar as ações aprovadas.");
    },
    onError: (error: Error) => Alert.alert("Não foi possível aplicar", error.message),
  });
  const reject = useMutation({
    mutationFn: (plan: MobilePendingAgentPlan) =>
      reviewMobileAgentPlan({
        runId: plan.runId,
        planFingerprint: plan.planFingerprint,
        decision: "reject",
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["agents", "pending-plans"] });
      Alert.alert("Plano rejeitado", "Nenhuma nova ação deste plano será aplicada.");
    },
    onError: (error: Error) => Alert.alert("Não foi possível rejeitar", error.message),
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  return (
    <AppScreen scroll contentContainerStyle={styles.page}>
      <StandardHeader title="Agents" />
      <Text style={styles.eyebrow}>KIVRYN AGENTIC CORE</Text>
      <Text style={styles.title}>Agents com skills, connectors e subagents</Text>
      <Text style={styles.copy}>
        Converse com seus Agents, execute briefings no servidor e revise qualquer proposta de alteração antes que o KIVRYN aplique algo no workspace.
      </Text>
      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          OpenAI produz raciocínio e propostas; o KIVRYN mantém a autoridade. Nenhuma alteração em Tasks, Projects ou Studies é aplicada por uma tool call do modelo. Planos de ação aparecem abaixo e exigem sua aprovação explícita.
        </Text>
      </View>

      <PendingApprovals
        pending={pendingPlans.isPending}
        error={pendingPlans.isError}
        items={pendingPlans.data ?? []}
        retry={() => void pendingPlans.refetch()}
        approving={approve.isPending}
        rejecting={reject.isPending}
        approve={(plan) => approve.mutate(plan)}
        reject={(plan) => reject.mutate(plan)}
      />

      <ActionHistory
        pending={actionHistory.isPending}
        error={actionHistory.isError}
        items={actionHistory.data ?? []}
        retry={() => void actionHistory.refetch()}
      />

      {query.isPending && <ActivityIndicator color={colors.primaryBright} />}
      {query.isError && (
        <Pressable style={styles.outlineButton} onPress={() => void query.refetch()}>
          <Text style={styles.outlineButtonText}>Tentar novamente</Text>
        </Pressable>
      )}
      {query.isSuccess && !query.data.length && (
        <View style={styles.empty}>
          <Text style={styles.cardTitle}>Nenhum Agent ainda</Text>
          <Text style={styles.copy}>
            Crie seu primeiro Agent na área Agents do KIVRYN Web. O mesmo Agent aparecerá aqui para conversar, aprovar planos e agendar briefings.
          </Text>
        </View>
      )}

      {query.data?.map((agent) => (
        <View key={agent.id} style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{agent.name}</Text>
              <Text numberOfLines={2} style={styles.muted}>
                {agent.goal || agent.description || "Agent KIVRYN"}
              </Text>
            </View>
            <View style={[styles.badge, !agent.active && styles.badgeMuted]}>
              <Text style={styles.badgeText}>{agent.active ? "ATIVO" : "PAUSADO"}</Text>
            </View>
          </View>
          {!!agent.skills.length && (
            <View style={styles.skillWrap}>
              {agent.skills.map((skill) => (
                <View key={skill.id} style={styles.skillBadge}>
                  <Text style={styles.skillBadgeText}>{skill.name}</Text>
                </View>
              ))}
            </View>
          )}
          <ManualAgentRunner agent={agent} />
          <Text style={styles.scheduleText}>
            {agent.scheduleFrequency ? cadence(agent) : "Sem agendamento ativo"}
          </Text>
          {agent.nextRunAt && (
            <Text style={styles.muted}>Próxima: {new Date(agent.nextRunAt).toLocaleString("pt-BR")}</Text>
          )}
          <Pressable
            style={styles.primaryButton}
            onPress={() => setEditingId(editingId === agent.id ? null : agent.id)}
          >
            <Text style={styles.primaryButtonText}>
              {editingId === agent.id
                ? "Fechar"
                : agent.scheduleFrequency
                  ? "Editar agendamento"
                  : "Agendar briefing"}
            </Text>
          </Pressable>
          {editingId === agent.id && (
            <ScheduleEditor agent={agent} close={() => setEditingId(null)} />
          )}
        </View>
      ))}
    </AppScreen>
  );
}

function ManualAgentRunner({ agent }: { agent: MobileAgent }) {
  const client = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [approvalRequired, setApprovalRequired] = useState(false);
  const run = useMutation({
    mutationFn: () => runMobileAgent(agent.id, input),
    onSuccess: async (result) => {
      setOutput(result.output);
      setApprovalRequired(result.approvalRequired);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["agents", "pending-plans"] }),
        client.invalidateQueries({ queryKey: ["agents", "action-history"] }),
      ]);
    },
    onError: (error: Error) => Alert.alert("Não foi possível executar", error.message),
  });

  return (
    <View style={styles.runnerWrap}>
      <Pressable
        style={styles.outlineButton}
        onPress={() => setExpanded((current) => !current)}
      >
        <Text style={styles.outlineButtonText}>
          {expanded ? "Fechar conversa" : "Conversar com este Agent"}
        </Text>
      </Pressable>
      {expanded && (
        <View style={styles.runner}>
          <Text style={styles.label}>Mensagem</Text>
          <TextInput
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={12000}
            editable={!run.isPending}
            placeholder="Peça algo ao Agent…"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.runnerInput]}
            textAlignVertical="top"
          />
          <Pressable
            disabled={!agent.active || !input.trim() || run.isPending}
            style={[
              styles.primaryButton,
              (!agent.active || !input.trim() || run.isPending) && styles.disabled,
            ]}
            onPress={() => run.mutate()}
          >
            {run.isPending ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.primaryButtonText}>Enviar</Text>
            )}
          </Pressable>
          {!agent.active && <Text style={styles.muted}>Ative este Agent para executá-lo.</Text>}
          {!!output && (
            <View style={styles.agentBubble}>
              <Text style={styles.agentBubbleLabel}>KIVRYN AGENT</Text>
              <Text style={styles.agentBubbleText}>{output}</Text>
              {approvalRequired && (
                <Text style={styles.approvalHint}>
                  O Agent preparou um plano. Nada foi alterado ainda — revise em Aprovações pendentes.
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function PendingApprovals({
  pending,
  error,
  items,
  retry,
  approving,
  rejecting,
  approve,
  reject,
}: {
  pending: boolean;
  error: boolean;
  items: MobilePendingAgentPlan[];
  retry: () => void;
  approving: boolean;
  rejecting: boolean;
  approve: (plan: MobilePendingAgentPlan) => void;
  reject: (plan: MobilePendingAgentPlan) => void;
}) {
  return (
    <View style={styles.approvalCard}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Aprovações pendentes</Text>
          <Text style={styles.muted}>Revise planos antes de qualquer alteração no workspace.</Text>
        </View>
        <View style={styles.auditBadge}>
          <Text style={styles.auditBadgeText}>APPROVAL</Text>
        </View>
      </View>
      {pending && <ActivityIndicator color={colors.primaryBright} />}
      {error && (
        <Pressable style={styles.outlineButton} onPress={retry}>
          <Text style={styles.outlineButtonText}>Tentar carregar aprovações</Text>
        </Pressable>
      )}
      {!pending && !error && !items.length && (
        <Text style={styles.muted}>Nenhum plano aguardando sua decisão.</Text>
      )}
      {items.map((plan) => {
        const remaining = plan.plan.steps.filter((step) => !plan.appliedStepIds.includes(step.id));
        return (
          <View key={plan.runId} style={styles.approvalPlan}>
            <Text style={styles.historyTitle}>{plan.plan.intent}</Text>
            {plan.plan.steps.map((step, index) => (
              <View key={step.id} style={styles.approvalStep}>
                <Text style={styles.label}>
                  {index + 1}. {step.action.replaceAll("_", " ")}
                </Text>
                <Text style={styles.muted}>
                  {plan.appliedStepIds.includes(step.id) ? "Aplicada" : step.domain}
                </Text>
                <Text numberOfLines={3} style={styles.muted}>
                  {Object.entries(step.input)
                    .map(([key, value]) => `${key}: ${String(value)}`)
                    .join(" · ") || "Sem parâmetros adicionais"}
                </Text>
                {step.domain === "integrations" ? (
                  <Text style={styles.externalWarning}>
                    Ação externa: ao aprovar, o KIVRYN poderá enviar/criar este item no serviço conectado.
                  </Text>
                ) : null}
              </View>
            ))}
            <View style={styles.buttonRow}>
              <Pressable
                disabled={!remaining.length || approving || rejecting}
                style={[
                  styles.primaryButton,
                  styles.flexButton,
                  (!remaining.length || approving || rejecting) && styles.disabled,
                ]}
                onPress={() => approve(plan)}
              >
                <Text style={styles.primaryButtonText}>
                  {approving ? "Aplicando…" : "Aprovar restantes"}
                </Text>
              </Pressable>
              <Pressable
                disabled={approving || rejecting}
                style={[styles.outlineButton, styles.flexButton]}
                onPress={() => reject(plan)}
              >
                <Text style={styles.outlineButtonText}>
                  {rejecting ? "Rejeitando…" : "Rejeitar"}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ActionHistory({
  pending,
  error,
  items,
  retry,
}: {
  pending: boolean;
  error: boolean;
  items: Awaited<ReturnType<typeof listMobileActionHistory>>;
  retry: () => void;
}) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Histórico de ações</Text>
          <Text style={styles.muted}>Auditoria persistente e limitada ao proprietário.</Text>
        </View>
        <View style={styles.auditBadge}>
          <Text style={styles.auditBadgeText}>AUDIT</Text>
        </View>
      </View>
      {pending && <ActivityIndicator color={colors.primaryBright} />}
      {error && (
        <Pressable style={styles.outlineButton} onPress={retry}>
          <Text style={styles.outlineButtonText}>Tentar histórico novamente</Text>
        </Pressable>
      )}
      {!pending && !error && !items.length && (
        <Text style={styles.muted}>Nenhuma ação de workspace aplicada ainda.</Text>
      )}
      {items.map((item) => (
        <View key={item.id} style={styles.historyRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.historyTitle}>
              {ACTION_LABELS[item.actionType] ?? item.actionType.replaceAll("_", " ")}
            </Text>
            <Text style={styles.muted}>
              {DOMAIN_LABELS[item.domain]} · {new Date(item.appliedAt ?? item.createdAt).toLocaleString("pt-BR")}
            </Text>
          </View>
          <Text
            style={[
              styles.historyStatus,
              item.status === "failed" && styles.historyStatusFailed,
              item.status === "uncertain" && styles.historyStatusUncertain,
            ]}
          >
            {item.status.toUpperCase()}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ScheduleEditor({ agent, close }: { agent: MobileAgent; close: () => void }) {
  const client = useQueryClient();
  const [frequency, setFrequency] = useState<"daily" | "weekly">(
    agent.scheduleFrequency ?? "daily",
  );
  const [time, setTime] = useState(agent.scheduleTime ?? "08:00");
  const [weekdays, setWeekdays] = useState<number[]>(
    agent.scheduleWeekdays.length ? agent.scheduleWeekdays : [1],
  );
  const [timezone, setTimezone] = useState(
    agent.scheduleTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
  );
  const [prompt, setPrompt] = useState(agent.schedulePrompt ?? agent.goal ?? "");
  const [notify, setNotify] = useState(agent.notifyOnRun);
  const save = useMutation({
    mutationFn: () =>
      configureMobileAgentSchedule({
        agentId: agent.id,
        frequency,
        localTime: time,
        weekdays,
        timezone,
        prompt,
        notifyOnRun: notify,
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["agents", "scheduled"] });
      Alert.alert("Agendamento salvo", "O KIVRYN executará este briefing no servidor.");
      close();
    },
    onError: (error: Error) => Alert.alert("Não foi possível salvar", error.message),
  });
  const clear = useMutation({
    mutationFn: () => clearMobileAgentSchedule(agent.id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["agents", "scheduled"] });
      Alert.alert("Agendamento desativado");
      close();
    },
    onError: (error: Error) => Alert.alert("Não foi possível desativar", error.message),
  });

  const toggleDay = (day: number) =>
    setWeekdays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );

  return (
    <View style={styles.editor}>
      <Text style={styles.label}>Frequência</Text>
      <View style={styles.segmentRow}>
        <Pressable
          style={[styles.segment, frequency === "daily" && styles.segmentActive]}
          onPress={() => setFrequency("daily")}
        >
          <Text style={styles.segmentText}>Diário</Text>
        </Pressable>
        <Pressable
          style={[styles.segment, frequency === "weekly" && styles.segmentActive]}
          onPress={() => setFrequency("weekly")}
        >
          <Text style={styles.segmentText}>Semanal</Text>
        </Pressable>
      </View>
      <Text style={styles.label}>Horário local</Text>
      <TextInput
        value={time}
        onChangeText={setTime}
        placeholder="08:00"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      {frequency === "weekly" && (
        <>
          <Text style={styles.label}>Dias</Text>
          <View style={styles.days}>
            {DAYS.map(([day, label]) => (
              <Pressable
                key={day}
                onPress={() => toggleDay(day)}
                style={[styles.day, weekdays.includes(day) && styles.dayActive]}
              >
                <Text style={styles.dayText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Text style={styles.label}>Fuso horário</Text>
      <TextInput
        value={timezone}
        onChangeText={setTimezone}
        autoCapitalize="none"
        placeholder="America/Bahia"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      <Text style={styles.label}>Briefing</Text>
      <TextInput
        value={prompt}
        onChangeText={setPrompt}
        multiline
        maxLength={12000}
        placeholder="O que este Agent deve produzir automaticamente?"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, styles.textarea]}
        textAlignVertical="top"
      />
      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Notificar ao concluir</Text>
          <Text style={styles.muted}>Push respeita seu horário silencioso.</Text>
        </View>
        <Switch value={notify} onValueChange={setNotify} trackColor={{ true: colors.primary }} />
      </View>
      <Pressable
        disabled={save.isPending || !prompt.trim()}
        style={[styles.primaryButton, (save.isPending || !prompt.trim()) && styles.disabled]}
        onPress={() => save.mutate()}
      >
        <Text style={styles.primaryButtonText}>
          {save.isPending ? "Salvando…" : "Salvar agendamento"}
        </Text>
      </Pressable>
      {agent.scheduleFrequency && (
        <Pressable
          disabled={clear.isPending}
          style={styles.outlineButton}
          onPress={() => clear.mutate()}
        >
          <Text style={styles.outlineButtonText}>
            {clear.isPending ? "Desativando…" : "Desativar agendamento"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function cadence(agent: MobileAgent) {
  if (agent.scheduleFrequency === "daily")
    return `Todos os dias · ${agent.scheduleTime ?? "—"}`;
  const days = agent.scheduleWeekdays
    .map((day) => DAYS.find(([value]) => value === day)?.[1])
    .filter(Boolean)
    .join(", ");
  return `${days || "Semanal"} · ${agent.scheduleTime ?? "—"}`;
}

const styles = StyleSheet.create({
  page: { gap: spacing.sm, paddingBottom: spacing.xl },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  title: { ...typography.title, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted },
  notice: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  noticeText: { ...typography.caption, color: colors.textMuted },
  empty: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  skillWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  skillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  skillBadgeText: { ...typography.caption, color: colors.primaryBright, fontSize: 10 },
  runnerWrap: { gap: spacing.sm },
  runner: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  runnerInput: { minHeight: 96 },
  agentBubble: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
  },
  agentBubbleLabel: { ...typography.eyebrow, color: colors.primaryBright, fontSize: 9 },
  agentBubbleText: { ...typography.body, color: colors.text },
  approvalHint: { ...typography.caption, color: colors.primaryBright },
  approvalCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryBright,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  approvalPlan: {
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  approvalStep: {
    gap: 4,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  buttonRow: { flexDirection: "row", gap: spacing.sm },
  flexButton: { flex: 1 },
  historyCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  historyTitle: { ...typography.label, color: colors.text },
  historyStatus: { ...typography.eyebrow, color: colors.primaryBright, fontSize: 9 },
  historyStatusFailed: { color: colors.danger },
  historyStatusUncertain: { color: colors.warning },
  externalWarning: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  auditBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  auditBadgeText: { ...typography.eyebrow, color: colors.primaryBright, fontSize: 9 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  cardTitle: { ...typography.heading, color: colors.text },
  muted: { ...typography.caption, color: colors.textMuted },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.accentMuted,
  },
  badgeMuted: { opacity: 0.55 },
  badgeText: { ...typography.eyebrow, color: colors.text, fontSize: 9 },
  scheduleText: { ...typography.label, color: colors.primaryBright },
  editor: {
    marginTop: spacing.sm,
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  label: { ...typography.label, color: colors.text },
  input: {
    ...typography.body,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
  },
  textarea: { minHeight: 120 },
  segmentRow: { flexDirection: "row", gap: spacing.sm },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primaryBright },
  segmentText: { ...typography.label, color: colors.text },
  days: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  day: {
    minWidth: 42,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  dayActive: { backgroundColor: colors.primary },
  dayText: { ...typography.caption, color: colors.text },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: { ...typography.label, color: colors.text },
  outlineButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  outlineButtonText: { ...typography.label, color: colors.primaryBright },
  disabled: { opacity: 0.45 },
});
