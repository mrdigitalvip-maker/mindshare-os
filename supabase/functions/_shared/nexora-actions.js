export const NEXORA_NAVIGATION_ACTIONS = [
  "navigate_dashboard",
  "navigate_projects",
  "navigate_productivity",
  "navigate_studies",
  "navigate_studio",
  "navigate_agents",
  "navigate_content",
  "navigate_documents",
  "navigate_finance",
  "navigate_settings",
  "navigate_premium",
];

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
];

const navigation = new Set(NEXORA_NAVIGATION_ACTIONS);
const mutations = new Set(NEXORA_MUTATION_ACTIONS);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const date = /^\d{4}-\d{2}-\d{2}$/;
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

/** Strictly validate the model's untrusted mutation proposal. */
export function parseNexoraProposal(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (Object.keys(value).some((key) => !fields.has(key))) return null;
  if (typeof value.action_type !== "string" || !mutations.has(value.action_type)) return null;
  for (const key of ["resource_id", "project_id", "subject_id"])
    if (value[key] != null && (typeof value[key] !== "string" || !uuid.test(value[key])))
      return null;
  if (value.due_date != null && (typeof value.due_date !== "string" || !date.test(value.due_date)))
    return null;
  if (value.priority != null && !["low", "medium", "high"].includes(value.priority)) return null;
  for (const key of ["title", "objective", "value"])
    if (
      value[key] != null &&
      (typeof value[key] !== "string" || !value[key].trim() || value[key].length > 500)
    )
      return null;
  if (
    value.target_value != null &&
    (!Number.isInteger(value.target_value) || value.target_value < 1 || value.target_value > 100000)
  )
    return null;
  const type = value.action_type;
  if (
    ["create_task", "create_project", "add_task_to_project", "create_study_goal"].includes(type) &&
    !value.title
  )
    return null;
  if (type === "add_task_to_project" && !value.project_id) return null;
  if (type === "create_study_goal" && !value.subject_id) return null;
  if (
    !["create_task", "create_project", "add_task_to_project", "create_study_goal"].includes(type) &&
    !value.resource_id
  )
    return null;
  if (["reschedule_task"].includes(type) && !value.due_date) return null;
  if (
    ["set_task_next_action", "set_task_blocker", "set_subject_next_action"].includes(type) &&
    !value.value
  )
    return null;
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item != null));
}

/** Treat model output as untrusted input and retain only the public response contract. */
export function parseNexoraModelResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (typeof value.message !== "string" || !value.message.trim()) return null;
  const response = { message: value.message.trim() };
  if (value.action?.type === "navigation" && navigation.has(value.action.name))
    response.action = { type: "navigation", name: value.action.name };
  if (Array.isArray(value.proposed_actions)) {
    const proposed = value.proposed_actions.map(parseNexoraProposal);
    if (proposed.length <= 5 && proposed.length && proposed.every(Boolean))
      response.proposed_actions = proposed;
  }
  return response;
}
