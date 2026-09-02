const validId = (id: string) => {
  const normalized = id.trim();
  if (!normalized) throw new Error("A non-empty resource ID is required.");
  return normalized;
};

export const queryKeys = {
  profile: ["profile"] as const,
  projects: ["projects"] as const,
  project: (id: string) => ["projects", validId(id)] as const,
  projectCheckIns: (id: string) => ["projects", validId(id), "check-ins"] as const,
  tasks: ["tasks"] as const,
  task: (id: string) => ["tasks", "detail", validId(id)] as const,
  projectTasks: (id: string) => ["tasks", "project", validId(id)] as const,
  studySubjects: ["study-subjects"] as const,
  studyOverview: ["study-overview"] as const,
  studySubject: (id: string) => ["study-subjects", validId(id)] as const,
  conversations: ["conversations"] as const,
  conversation: (id: string) => ["conversations", validId(id)] as const,
  subscription: ["subscription"] as const,
  journeys: ["journeys"] as const,
  journey: (id: string) => ["journeys", validId(id)] as const,
  journeyProgram: (id: string) => ["journeys", validId(id), "program"] as const,
  dailyMission: ["journeys", "daily-mission"] as const,
  momentum: ["journeys", "momentum"] as const,
  journeyChallenge: ["journeys", "challenge"] as const,
  journeyPacks: ["journey-packs"] as const,
  journeyPack: (slug: string) => ["journey-packs", validId(slug)] as const,
  arena: ["arena"] as const,
  community: ["community"] as const,
  communityChannels: ["community", "channels"] as const,
  communityMessages: (id: string) => ["community", "channel", validId(id), "messages"] as const,
  squad: (id: string) => ["community", "squad", validId(id)] as const,
};

/** Queries backed by a newly verified execution event. Keep this list centralized. */
export const verifiedExecutionInvalidations = [
  queryKeys.tasks,
  queryKeys.studySubjects,
  queryKeys.studyOverview,
  queryKeys.journeys,
  queryKeys.momentum,
  queryKeys.journeyChallenge,
  queryKeys.arena,
  queryKeys.community,
] as const;

export function taskMutationInvalidations(
  projectId?: string | null,
  previousProjectId?: string | null,
) {
  const projectIds = [...new Set([projectId, previousProjectId].filter(Boolean) as string[])];
  return [
    queryKeys.tasks,
    queryKeys.projects,
    queryKeys.journeys,
    queryKeys.dailyMission,
    ...projectIds.flatMap((id) => [queryKeys.project(id), queryKeys.projectTasks(id)]),
  ] as const;
}
