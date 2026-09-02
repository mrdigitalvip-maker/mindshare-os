export const nexoraActionTypes = [
  "create_task",
  "update_task",
  "reschedule_task",
  "complete_task",
  "set_task_next_action",
  "set_task_blocker",
  "clear_task_blocker",
  "create_project",
  "update_project",
  "complete_project",
  "add_task_to_project",
  "create_study_goal",
  "update_study_goal",
  "set_subject_next_action",
] as const;
export type NexoraActionType = (typeof nexoraActionTypes)[number];
export type NexoraAction = {
  action_type: NexoraActionType;
  title?: string;
  resource_id?: string;
  project_id?: string;
  subject_id?: string;
  due_date?: string;
  priority?: "low" | "medium" | "high";
  objective?: string;
  value?: string;
  expected_updated_at?: string;
  target_value?: number;
};
export type NexoraActionStatus = "pending" | "applying" | "applied" | "failed" | "cancelled";
const types = new Set<string>(nexoraActionTypes);
const ids = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields = new Set([
  "action_type",
  "title",
  "resource_id",
  "project_id",
  "subject_id",
  "due_date",
  "priority",
  "objective",
  "value",
  "expected_updated_at",
  "target_value",
]);
export function parseNexoraActions(value: unknown): NexoraAction[] {
  if (!Array.isArray(value) || value.length > 5) return [];
  const actions = value.filter((raw): raw is NexoraAction => {
    if (!raw || typeof raw !== "object") return false;
    const item = raw as Record<string, unknown>;
    if (Object.keys(item).some((key) => !fields.has(key))) return false;
    if (!types.has(String(item.action_type))) return false;
    if (
      ["resource_id", "project_id", "subject_id"].some(
        (key) => item[key] != null && (typeof item[key] !== "string" || !ids.test(item[key])),
      )
    )
      return false;
    if (
      item.due_date != null &&
      (typeof item.due_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.due_date))
    )
      return false;
    if (
      item.expected_updated_at != null &&
      (typeof item.expected_updated_at !== "string" ||
        !Number.isFinite(Date.parse(item.expected_updated_at)))
    )
      return false;
    if (item.priority != null && !["low", "medium", "high"].includes(String(item.priority)))
      return false;
    return true;
  });
  // Never turn a malformed multi-action response into a misleading partial proposal.
  return actions.length === value.length ? actions : [];
}
export function actionPreview(action: NexoraAction) {
  const labels: Record<NexoraActionType, string> = {
    create_task: "Criar tarefa",
    update_task: "Atualizar tarefa",
    reschedule_task: "Reagendar tarefa",
    complete_task: "Concluir tarefa",
    set_task_next_action: "Definir próxima ação",
    set_task_blocker: "Marcar tarefa como bloqueada",
    clear_task_blocker: "Remover bloqueio",
    create_project: "Criar projeto",
    update_project: "Atualizar projeto",
    complete_project: "Concluir projeto",
    add_task_to_project: "Adicionar tarefa ao projeto",
    create_study_goal: "Criar meta de estudo",
    update_study_goal: "Atualizar meta de estudo",
    set_subject_next_action: "Definir próxima ação de estudo",
  };
  const priority = { low: "Baixa", medium: "Média", high: "Alta" } as const;
  const date = action.due_date
    ? new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" }).format(
        new Date(`${action.due_date}T00:00:00Z`),
      )
    : null;
  const details = [
    action.title,
    action.objective ? `Objetivo: ${action.objective}` : null,
    action.value ? `Nova informação: ${action.value}` : null,
    date ? `${action.action_type === "reschedule_task" ? "Novo prazo" : "Prazo"}: ${date}` : null,
    action.priority ? `Prioridade: ${priority[action.priority]}` : null,
  ].filter(Boolean) as string[];
  return { label: labels[action.action_type], details };
}

export const actionInvalidationRoots = (actions: NexoraAction[]) => {
  const roots = new Set<string>();
  for (const action of actions) {
    if (action.action_type.includes("task")) {
      roots.add("tasks");
      roots.add("projects");
      roots.add("journeys");
    }
    if (action.action_type.includes("project")) {
      roots.add("projects");
      roots.add("tasks");
    }
    if (action.action_type.includes("study") || action.action_type.includes("subject")) {
      roots.add("study-subjects");
      roots.add("study-overview");
      roots.add("journeys");
    }
  }
  return [...roots];
};

export function actionReceipt(action: NexoraAction): string {
  const receipts: Record<NexoraActionType, string> = {
    create_task: "Tarefa criada.",
    update_task: "Tarefa atualizada.",
    reschedule_task: "Tarefa reagendada.",
    complete_task: "Tarefa concluída.",
    set_task_next_action: "Próxima ação atualizada.",
    set_task_blocker: "Bloqueio atualizado.",
    clear_task_blocker: "Bloqueio removido.",
    create_project: "Projeto criado.",
    update_project: "Projeto atualizado.",
    complete_project: "Projeto concluído.",
    add_task_to_project: "Tarefa adicionada ao projeto.",
    create_study_goal: "Meta de estudo criada.",
    update_study_goal: "Meta de estudo atualizada.",
    set_subject_next_action: "Próxima ação de estudo atualizada.",
  };
  return receipts[action.action_type];
}

export function actionResultRoute(action: NexoraAction, resourceId: string) {
  if (!ids.test(resourceId)) return null;
  if (action.action_type.includes("task"))
    return {
      label: action.action_type === "create_task" ? "Abrir tarefa" : "Ver tarefa",
      href: `/tasks/${resourceId}` as const,
    };
  if (action.action_type.includes("project"))
    return {
      label: action.action_type === "create_project" ? "Abrir projeto" : "Ver projeto",
      href: `/projects/${resourceId}` as const,
    };
  if (action.action_type === "set_subject_next_action")
    return { label: "Ver disciplina", href: `/studies/${resourceId}` as const };
  return null;
}
