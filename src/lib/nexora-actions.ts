export const NEXORA_ACTIONS = {
  navigate_dashboard: "/dashboard",
  navigate_projects: "/projects",
  navigate_productivity: "/productivity",
  navigate_studies: "/studies",
  navigate_studio: "/studio",
  navigate_agents: "/agents",
  navigate_content: "/content",
  navigate_documents: "/documents",
  navigate_finance: "/finance",
  navigate_settings: "/settings",
  navigate_premium: "/premium",
} as const;
export type NexoraAction = keyof typeof NEXORA_ACTIONS;

/** Executes only allow-listed, non-mutating actions returned by the AI tool contract. */
export function resolveNexoraAction(action?: string) {
  return action && action in NEXORA_ACTIONS ? NEXORA_ACTIONS[action as NexoraAction] : null;
}

export const NEXORA_MUTATION_ACTIONS = [
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
  "create_personal_challenge",
] as const;

export type NexoraMutationActionType = (typeof NEXORA_MUTATION_ACTIONS)[number];
export type NexoraMutationAction = {
  action_type: NexoraMutationActionType;
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
  challenge_period?: "daily" | "weekly" | "monthly";
  challenge_category?: "execution" | "study" | "fitness" | "wellbeing" | "journey" | "custom";
};

export type NexoraMutationStatus = "pending" | "applying" | "applied" | "failed" | "cancelled";

const mutationTypes = new Set<string>(NEXORA_MUTATION_ACTIONS);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const mutationFields = new Set([
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
  "challenge_period",
  "challenge_category",
]);

/** Re-validates the backend proposal before normal UI is allowed to offer confirmation. */
export function parseNexoraMutationActions(value: unknown): NexoraMutationAction[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 5) return [];
  const actions = value.filter((raw): raw is NexoraMutationAction => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const item = raw as Record<string, unknown>;
    if (Object.keys(item).some((key) => !mutationFields.has(key))) return false;
    if (!mutationTypes.has(String(item.action_type))) return false;
    if (
      ["resource_id", "project_id", "subject_id"].some(
        (key) => item[key] != null && (typeof item[key] !== "string" || !uuid.test(item[key])),
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
      (typeof item.expected_updated_at !== "string" || !Number.isFinite(Date.parse(item.expected_updated_at)))
    )
      return false;
    if (item.priority != null && !["low", "medium", "high"].includes(String(item.priority))) return false;
    if (
      item.challenge_period != null &&
      !["daily", "weekly", "monthly"].includes(String(item.challenge_period))
    )
      return false;
    if (
      item.challenge_category != null &&
      !["execution", "study", "fitness", "wellbeing", "journey", "custom"].includes(
        String(item.challenge_category),
      )
    )
      return false;
    if (
      item.target_value != null &&
      (!Number.isInteger(item.target_value) || Number(item.target_value) < 1 || Number(item.target_value) > 10000)
    )
      return false;
    for (const key of ["title", "objective", "value"] as const) {
      const field = item[key];
      if (field != null && (typeof field !== "string" || !field.trim() || field.length > 500)) return false;
    }
    if (item.action_type === "create_personal_challenge") {
      if (
        typeof item.title !== "string" ||
        !item.title.trim() ||
        !item.challenge_period ||
        !item.challenge_category ||
        item.target_value == null
      )
        return false;
    }
    return true;
  });
  return actions.length === value.length ? actions : [];
}

export function actionPreview(action: NexoraMutationAction) {
  const labels: Record<NexoraMutationActionType, string> = {
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
    create_personal_challenge: "Criar desafio pessoal",
  };
  const priority = { low: "Baixa", medium: "Média", high: "Alta" } as const;
  const period = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" } as const;
  const category = {
    execution: "Execução",
    study: "Estudos",
    fitness: "Fitness",
    wellbeing: "Bem-estar",
    journey: "Jornada",
    custom: "Pessoal",
  } as const;
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
    action.challenge_period ? `Período: ${period[action.challenge_period]}` : null,
    action.challenge_category ? `Categoria: ${category[action.challenge_category]}` : null,
    action.action_type === "create_personal_challenge" && action.target_value
      ? `Meta: ${action.target_value}`
      : null,
  ].filter(Boolean) as string[];
  return { label: labels[action.action_type], details };
}

export function actionReceipt(action: NexoraMutationAction): string {
  const receipts: Record<NexoraMutationActionType, string> = {
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
    create_personal_challenge: "Desafio criado.",
  };
  return receipts[action.action_type];
}
