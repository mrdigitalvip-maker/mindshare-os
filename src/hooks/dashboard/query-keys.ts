export const dashboardQueryKeys = {
  stats: (userId?: string) => ["dashboard", "stats", userId] as const,
  suggestions: (userId?: string) => ["dashboard", "suggestions", userId] as const,
  projects: (userId?: string) => ["dashboard", "projects", userId] as const,
  activity: (userId?: string) => ["dashboard", "activity", userId] as const,
} as const;
