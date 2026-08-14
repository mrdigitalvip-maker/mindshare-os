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
