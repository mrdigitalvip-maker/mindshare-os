export type KivrynActionDomain = "tasks" | "projects" | "studies" | "integrations";
export type KivrynActionRisk = "read" | "mutation";

export interface KivrynActionDefinition {
  name: string;
  domain: KivrynActionDomain;
  risk: KivrynActionRisk;
  requiresApproval: boolean;
  requiredFields: readonly string[];
  optionalFields: readonly string[];
}

const define = <T extends KivrynActionDefinition>(action: T) => action;

export const KIVRYN_ACTION_REGISTRY = {
  create_task: define({ name: "create_task", domain: "tasks", risk: "mutation", requiresApproval: true, requiredFields: ["title"], optionalFields: ["due_date", "priority", "project_id"] }),
  update_task: define({ name: "update_task", domain: "tasks", risk: "mutation", requiresApproval: true, requiredFields: ["resource_id"], optionalFields: ["title", "due_date", "priority", "expected_updated_at"] }),
  reschedule_task: define({ name: "reschedule_task", domain: "tasks", risk: "mutation", requiresApproval: true, requiredFields: ["resource_id", "due_date"], optionalFields: ["expected_updated_at"] }),
  complete_task: define({ name: "complete_task", domain: "tasks", risk: "mutation", requiresApproval: true, requiredFields: ["resource_id"], optionalFields: ["expected_updated_at"] }),
  set_task_next_action: define({ name: "set_task_next_action", domain: "tasks", risk: "mutation", requiresApproval: true, requiredFields: ["resource_id", "value"], optionalFields: ["expected_updated_at"] }),
  set_task_blocker: define({ name: "set_task_blocker", domain: "tasks", risk: "mutation", requiresApproval: true, requiredFields: ["resource_id", "value"], optionalFields: ["expected_updated_at"] }),
  clear_task_blocker: define({ name: "clear_task_blocker", domain: "tasks", risk: "mutation", requiresApproval: true, requiredFields: ["resource_id"], optionalFields: ["expected_updated_at"] }),
  create_project: define({ name: "create_project", domain: "projects", risk: "mutation", requiresApproval: true, requiredFields: ["title"], optionalFields: ["due_date", "objective"] }),
  update_project: define({ name: "update_project", domain: "projects", risk: "mutation", requiresApproval: true, requiredFields: ["resource_id"], optionalFields: ["title", "due_date", "objective", "expected_updated_at"] }),
  complete_project: define({ name: "complete_project", domain: "projects", risk: "mutation", requiresApproval: true, requiredFields: ["resource_id"], optionalFields: ["expected_updated_at"] }),
  add_task_to_project: define({ name: "add_task_to_project", domain: "projects", risk: "mutation", requiresApproval: true, requiredFields: ["title", "project_id"], optionalFields: ["due_date", "priority"] }),
  create_study_goal: define({ name: "create_study_goal", domain: "studies", risk: "mutation", requiresApproval: true, requiredFields: ["title", "subject_id"], optionalFields: ["due_date", "objective"] }),
  update_study_goal: define({ name: "update_study_goal", domain: "studies", risk: "mutation", requiresApproval: true, requiredFields: ["resource_id"], optionalFields: ["title", "due_date", "objective", "expected_updated_at"] }),
  set_subject_next_action: define({ name: "set_subject_next_action", domain: "studies", risk: "mutation", requiresApproval: true, requiredFields: ["resource_id", "value"], optionalFields: ["expected_updated_at"] }),
  send_email: define({
    name: "send_email",
    domain: "integrations",
    risk: "mutation",
    requiresApproval: true,
    requiredFields: ["to", "subject", "body"],
    optionalFields: ["cc", "bcc"],
  }),
  create_calendar_event: define({
    name: "create_calendar_event",
    domain: "integrations",
    risk: "mutation",
    requiresApproval: true,
    requiredFields: ["summary", "start", "end"],
    optionalFields: ["description", "location", "attendees"],
  }),
  create_drive_text_file: define({
    name: "create_drive_text_file",
    domain: "integrations",
    risk: "mutation",
    requiresApproval: true,
    requiredFields: ["name", "content"],
    optionalFields: [],
  }),
} as const;

export type KivrynActionName = keyof typeof KIVRYN_ACTION_REGISTRY;

export function getKivrynActionDefinition(name: unknown): KivrynActionDefinition | null {
  if (typeof name !== "string" || !(name in KIVRYN_ACTION_REGISTRY)) return null;
  return KIVRYN_ACTION_REGISTRY[name as KivrynActionName];
}

export function isKivrynActionAllowed(name: unknown, allowedDomains: readonly KivrynActionDomain[]) {
  const action = getKivrynActionDefinition(name);
  return Boolean(action && allowedDomains.includes(action.domain));
}

export function validateKivrynActionInput(name: unknown, input: unknown) {
  const action = getKivrynActionDefinition(name);
  if (!action || !input || typeof input !== "object" || Array.isArray(input)) return false;
  const payload = input as Record<string, unknown>;
  const allowed = new Set(["action_type", ...action.requiredFields, ...action.optionalFields]);
  if (Object.keys(payload).some((key) => !allowed.has(key))) return false;
  return action.requiredFields.every((field) => payload[field] !== undefined && payload[field] !== null && payload[field] !== "");
}
