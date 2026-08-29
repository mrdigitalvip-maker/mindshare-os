const validId = (id: string) => {
  const normalized = id.trim();
  if (!normalized) throw new Error("A non-empty resource ID is required.");
  return normalized;
};

export const queryKeys = {
  profile: ["profile"] as const,
  projects: ["projects"] as const,
  project: (id: string) => ["projects", validId(id)] as const,
  tasks: ["tasks"] as const,
  projectTasks: (id: string) => ["tasks", "project", validId(id)] as const,
  studySubjects: ["study-subjects"] as const,
  studyOverview: ["study-overview"] as const,
  studySubject: (id: string) => ["study-subjects", validId(id)] as const,
  conversations: ["conversations"] as const,
  conversation: (id: string) => ["conversations", validId(id)] as const,
  subscription: ["subscription"] as const,
  journeys: ["journeys"] as const,
  journey: (id: string) => ["journeys", validId(id)] as const,
  dailyMission: ["journeys", "daily-mission"] as const,
  momentum: ["journeys", "momentum"] as const,
  journeyChallenge: ["journeys", "challenge"] as const,
  arena: ["arena"] as const,
};

export function taskMutationInvalidations(
  projectId?: string | null,
  previousProjectId?: string | null,
) {
  const projectIds = [...new Set([projectId, previousProjectId].filter(Boolean) as string[])];
  return [
    queryKeys.tasks,
    queryKeys.projects,
    ...projectIds.flatMap((id) => [queryKeys.project(id), queryKeys.projectTasks(id)]),
  ] as const;
}
