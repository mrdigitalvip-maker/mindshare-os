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
const allowedActions = new Set(NEXORA_NAVIGATION_ACTIONS);

/** Treat model output as untrusted input and retain only the public response contract. */
export function parseNexoraModelResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (typeof value.message !== "string" || !value.message.trim()) return null;
  const response = { message: value.message.trim() };
  if (!value.action || typeof value.action !== "object" || Array.isArray(value.action))
    return response;
  if (
    value.action.type === "navigation" &&
    typeof value.action.name === "string" &&
    allowedActions.has(value.action.name)
  ) {
    response.action = { type: "navigation", name: value.action.name };
  }
  return response;
}
