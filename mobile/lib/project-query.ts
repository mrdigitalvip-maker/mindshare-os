import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { ProjectWorkspace } from "@/services/workspace-service";

export type ProjectLoader = (userId: string, projectId: string) => Promise<ProjectWorkspace | null>;

export function projectQueryOptions(userId: string, projectId: string, loader: ProjectLoader) {
  const id = projectId.trim();
  return queryOptions({
    queryKey: id ? queryKeys.project(id) : (["projects", "invalid"] as const),
    queryFn: () => loader(userId, id),
    enabled: Boolean(userId && id),
  });
}

/** Starts canonical detail loading without delaying navigation. TanStack Query
 * deduplicates the destination observer against this same in-flight request. */
export function prefetchProject(
  client: QueryClient,
  userId: string,
  projectId: string,
  loader: ProjectLoader,
) {
  const options = projectQueryOptions(userId, projectId, loader);
  if (!options.enabled) return Promise.resolve();
  return client.prefetchQuery(options);
}
