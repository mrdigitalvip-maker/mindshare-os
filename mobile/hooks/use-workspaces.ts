import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, taskMutationInvalidations } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import * as service from "@/services/workspace-service";
import type { Task } from "@/services/workspace-service";

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
    onMutate: async (input) => {
      if (input.action !== "update" || input.patch.completed === undefined) return undefined;
      await client.cancelQueries({ queryKey: queryKeys.tasks });
      const previous = client.getQueryData<Task[]>(queryKeys.tasks);
      client.setQueryData<Task[]>(queryKeys.tasks, (tasks) =>
        tasks?.map((task) =>
          task.id === input.taskId ? { ...task, completed: input.patch.completed! } : task,
        ),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) client.setQueryData(queryKeys.tasks, context.previous);
    },
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
    mutationFn: (name: string) => service.createSubject(userId, name),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.studySubjects }),
  });
  const study = useMutation({
    mutationFn: (
      input:
        | { action: "goal"; subjectId: string; title: string }
        | { action: "goal-complete"; subjectId: string; goalId: string; completed: boolean }
        | { action: "session"; subjectId: string; activity: string; duration: number }
        | { action: "note"; subjectId: string; id?: string; title: string; content: string }
        | { action: "delete-note"; subjectId: string; noteId: string },
    ) => {
      if (input.action === "goal")
        return service.createStudyGoal(userId, input.subjectId, input.title);
      if (input.action === "goal-complete")
        return service.setStudyGoalCompleted(userId, input.goalId, input.completed);
      if (input.action === "session")
        return service.createStudySession(userId, input.subjectId, input.activity, input.duration);
      if (input.action === "note") return service.saveStudyNote(userId, input.subjectId, input);
      return service.deleteStudyNote(userId, input.noteId);
    },
    onSuccess: (_data, input) =>
      invalidate(client, [queryKeys.studySubjects, queryKeys.studySubject(input.subjectId)]),
  });
  return { createProject, updateProject, deleteProject, mutateTask, createSubject, study };
}
