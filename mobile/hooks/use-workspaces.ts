import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  taskMutationInvalidations,
  verifiedExecutionInvalidations,
} from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import * as service from "@/services/workspace-service";

function useUserId() {
  const { session } = useAuth();
  return session?.user.id ?? "";
}
export function useProjects() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => service.listProjects(userId),
    enabled: Boolean(userId),
  });
}
export function useProject(projectId: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: projectId ? queryKeys.project(projectId) : ["projects", "invalid"],
    queryFn: () => service.getProject(userId, projectId),
    enabled: Boolean(userId && projectId),
  });
}
export function useTasks() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.tasks,
    queryFn: () => service.listTasks(userId),
    enabled: Boolean(userId),
  });
}
export function useSubjects() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.studySubjects,
    queryFn: () => service.listSubjects(userId),
    enabled: Boolean(userId),
  });
}
export function useStudyOverview() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.studyOverview,
    queryFn: () => service.listStudyWorkspaces(userId),
    enabled: Boolean(userId),
  });
}
export function useSubject(subjectId: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: subjectId ? queryKeys.studySubject(subjectId) : ["study-subjects", "invalid"],
    queryFn: () => service.getSubjectWorkspace(userId, subjectId),
    enabled: Boolean(userId && subjectId),
  });
}
async function invalidate(
  client: ReturnType<typeof useQueryClient>,
  keys: readonly (readonly unknown[])[],
) {
  await Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
}
export function useWorkspaceMutations() {
  const userId = useUserId();
  const client = useQueryClient();
  const createProject = useMutation({
    mutationFn: (input: Parameters<typeof service.createProject>[1]) =>
      service.createProject(userId, input),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.projects }),
  });
  const updateProject = useMutation({
    mutationFn: ({
      projectId,
      patch,
    }: {
      projectId: string;
      patch: Parameters<typeof service.updateProject>[2];
    }) => service.updateProject(userId, projectId, patch),
    onSuccess: (_data, input) =>
      invalidate(client, [queryKeys.projects, queryKeys.project(input.projectId)]),
  });
  const deleteProject = useMutation({
    mutationFn: (projectId: string) => service.deleteProject(userId, projectId),
    onSuccess: (_data, projectId) =>
      invalidate(client, [queryKeys.projects, queryKeys.tasks, queryKeys.project(projectId)]),
  });
  const checkIn = useMutation({
    mutationFn: ({
      projectId,
      ...input
    }: Parameters<typeof service.createProjectCheckIn>[2] & { projectId: string }) =>
      service.createProjectCheckIn(userId, projectId, input),
    onSuccess: (_data, input) =>
      invalidate(client, [
        queryKeys.project(input.projectId),
        queryKeys.projectCheckIns(input.projectId),
      ]),
  });
  const mutateTask = useMutation({
    mutationFn: async (
      input:
        | {
            action: "create";
            title: string;
            description?: string;
            projectId?: string | null;
            priority?: string;
            dueDate?: string | null;
            nextAction?: string | null;
          }
        | {
            action: "update";
            taskId: string;
            projectId?: string | null;
            previousProjectId?: string | null;
            patch: Parameters<typeof service.updateTask>[2];
          }
        | { action: "delete"; taskId: string; projectId?: string | null },
    ) => {
      if (input.action === "create") await service.createTask(userId, input);
      else if (input.action === "update")
        await service.updateTask(userId, input.taskId, input.patch);
      else await service.deleteTask(userId, input.taskId);
    },
    // Completion is server-authoritative; never paint unverifiable optimistic progress.
    onSuccess: (_data, input) =>
      input.action === "update" && input.patch.completed === true
        ? invalidate(client, verifiedExecutionInvalidations)
        : undefined,
    onSettled: (_data, _error, input) =>
      invalidate(
        client,
        taskMutationInvalidations(
          input.action === "update" ? (input.patch.projectId ?? input.projectId) : input.projectId,
          input.action === "update" ? input.previousProjectId : undefined,
        ),
      ),
  });
  const createSubject = useMutation({
    mutationFn: (input: Parameters<typeof service.createSubject>[1]) =>
      service.createSubject(userId, input),
    onSuccess: () => invalidate(client, [queryKeys.studySubjects, queryKeys.studyOverview]),
  });
  const study = useMutation({
    mutationFn: (
      input:
        | {
            action: "subject";
            subjectId: string;
            patch: Parameters<typeof service.updateSubject>[2];
          }
        | { action: "goal"; subjectId: string; title: string; targetValue?: number }
        | {
            action: "goal-progress";
            subjectId: string;
            goalId: string;
            currentValue: number;
            targetValue: number;
          }
        | { action: "goal-complete"; subjectId: string; goalId: string; completed: boolean }
        | { action: "session-start"; subjectId: string; activity: string; plannedMinutes: number }
        | {
            action: "session-finish";
            subjectId: string;
            sessionId: string;
            activity: string;
            reflection: "understood" | "review" | "difficult";
          }
        | { action: "note"; subjectId: string; id?: string; title: string; content: string }
        | { action: "delete-note"; subjectId: string; noteId: string }
        | { action: "delete-subject"; subjectId: string },
    ) => {
      if (input.action === "subject")
        return service.updateSubject(userId, input.subjectId, input.patch);
      if (input.action === "goal")
        return service.createStudyGoal(userId, input.subjectId, input.title, input.targetValue);
      if (input.action === "goal-progress")
        return service.updateStudyGoal(userId, input.goalId, input.currentValue, input.targetValue);
      if (input.action === "goal-complete")
        return service.setStudyGoalCompleted(userId, input.goalId, input.completed);
      if (input.action === "session-start")
        return service
          .startStudySession(userId, input.subjectId, input.activity, input.plannedMinutes)
          .then(() => undefined);
      if (input.action === "session-finish")
        return service.finishStudySession(userId, input.sessionId, input);
      if (input.action === "note") return service.saveStudyNote(userId, input.subjectId, input);
      if (input.action === "delete-subject") return service.deleteSubject(userId, input.subjectId);
      return service.deleteStudyNote(userId, input.noteId);
    },
    onSuccess: async (_data, input) => {
      await invalidate(client, [
        queryKeys.studySubjects,
        queryKeys.studyOverview,
        queryKeys.studySubject(input.subjectId),
      ]);
      if (input.action === "session-finish")
        await invalidate(client, verifiedExecutionInvalidations);
    },
  });
  return { createProject, updateProject, deleteProject, checkIn, mutateTask, createSubject, study };
}
