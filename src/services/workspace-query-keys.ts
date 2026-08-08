export const workspaceQueryKeys = {
  dashboard: (userId?: string) => ["workspace", userId, "dashboard"] as const,
  search: (userId: string | undefined, query: string) =>
    ["workspace", userId, "search", query] as const,
  notifications: (userId?: string) => ["workspace", userId, "notifications"] as const,
  studies: (userId?: string) => ["workspace", userId, "studies"] as const,
  projects: (userId?: string) => ["workspace", userId, "projects"] as const,
  tasks: (userId?: string) => ["workspace", userId, "tasks"] as const,
  finance: ["workspace", "finance"] as const,
  agents: ["workspace", "agents"] as const,
  content: (userId?: string) => ["workspace", userId, "content"] as const,
  documents: ["workspace", "documents"] as const,
  translations: ["workspace", "translations"] as const,
  preferences: ["workspace", "preferences"] as const,
};
