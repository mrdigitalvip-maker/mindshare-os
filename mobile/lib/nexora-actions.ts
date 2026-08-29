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
const types = new Set<string>(nexoraActionTypes);
const ids = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseNexoraActions(value: unknown): NexoraAction[] {
  if (!Array.isArray(value) || value.length > 5) return [];
  return value.filter((raw): raw is NexoraAction => {
    if (!raw || typeof raw !== "object") return false;
    const item = raw as Record<string, unknown>;
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
    return true;
  });
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
  const details = [
    action.title,
    action.objective,
    action.value,
    action.due_date ? `Data: ${action.due_date.split("-").reverse().join("/")}` : null,
    action.priority ? `Prioridade: ${action.priority}` : null,
  ].filter(Boolean) as string[];
  return { label: labels[action.action_type], details };
}

export const actionInvalidationRoots = (actions: NexoraAction[]) => {
  const roots = new Set<string>(["profile"]);
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
    }
  }
  return [...roots];
};
