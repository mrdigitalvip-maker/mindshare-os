import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import {
  hasActiveOfficialMembership,
  type CommunityMessage,
  type OfficialChannel,
} from "../lib/community";
import { projectQueryOptions, prefetchProject, type ProjectLoader } from "../lib/project-query";
import {
  queryKeys,
  taskMutationInvalidations,
  verifiedExecutionInvalidations,
} from "../lib/query-keys";
import type { ProjectWorkspace } from "../services/workspace-service";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const projectScreen = source("../app/(app)/projects/[projectId].tsx");
const projectList = source("../app/(app)/(tabs)/projects/index.tsx");
const communityScreen = source("../app/(app)/community/[channelId].tsx");
const communityHooks = source("../hooks/use-community.ts");
const workspaceService = source("../services/workspace-service.ts");
const workspace: ProjectWorkspace = {
  project: { id: "project-1", title: "Canonical", description: "", status: "active" },
  tasks: [],
  checkIns: [],
  tasksUnavailable: false,
  checkInsUnavailable: false,
};
const client = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } });

describe("NXR-031 Project cache lifecycle", () => {
  test("cached authoritative detail remains renderable during refresh and after refresh failure", async () => {
    const qc = client();
    qc.setQueryData(queryKeys.project("project-1"), workspace);
    let reject!: (reason: Error) => void;
    const loader: ProjectLoader = () => new Promise((_resolve, failure) => (reject = failure));
    const observer = new QueryObserver(qc, projectQueryOptions("user-1", "project-1", loader));
    const unsubscribe = observer.subscribe(() => undefined);
    expect(observer.getCurrentResult().data).toEqual(workspace);
    expect(observer.getCurrentResult().fetchStatus).toBe("fetching");
    reject(new Error("offline"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(observer.getCurrentResult().data).toEqual(workspace);
    expect(qc.getQueryData(queryKeys.project("project-1"))).toEqual(workspace);
    unsubscribe();
  });

  test("uncached detail honestly remains pending until its authoritative loader resolves", async () => {
    const qc = client();
    let resolve!: (value: ProjectWorkspace) => void;
    const loader: ProjectLoader = () => new Promise((done) => (resolve = done));
    const observer = new QueryObserver(qc, projectQueryOptions("user-1", "project-1", loader));
    const unsubscribe = observer.subscribe(() => undefined);
    expect(observer.getCurrentResult().isPending).toBe(true);
    expect(observer.getCurrentResult().data).toBeUndefined();
    resolve(workspace);
    await new Promise((done) => setTimeout(done, 0));
    expect(observer.getCurrentResult().data).toEqual(workspace);
    unsubscribe();
  });

  test("list/detail identity is canonical and IDs are normalized", () => {
    expect(queryKeys.project(" project-1 ")).toEqual(["projects", "project-1"]);
    expect(projectQueryOptions("user-1", " project-1 ", async () => workspace).queryKey).toEqual(
      queryKeys.project("project-1"),
    );
  });

  test("prefetch and destination observers deduplicate one identical request", async () => {
    const qc = client();
    let calls = 0;
    let resolve!: (value: ProjectWorkspace) => void;
    const loader: ProjectLoader = () => {
      calls += 1;
      return new Promise((done) => (resolve = done));
    };
    const prefetched = prefetchProject(qc, "user-1", "project-1", loader);
    const destination = qc.fetchQuery(projectQueryOptions("user-1", "project-1", loader));
    expect(calls).toBe(1);
    resolve(workspace);
    await Promise.all([prefetched, destination]);
    expect(calls).toBe(1);
  });

  test("prefetch starts without blocking navigation", async () => {
    const qc = client();
    let resolve!: (value: ProjectWorkspace) => void;
    const pending = prefetchProject(
      qc,
      "user-1",
      "project-1",
      () => new Promise((done) => (resolve = done)),
    );
    expect(qc.getQueryState(queryKeys.project("project-1"))?.fetchStatus).toBe("fetching");
    expect(projectList).toContain("onOpen(project.id);\n        router.push");
    resolve(workspace);
    await pending;
  });

  test("no partial list Project masquerades as a complete workspace", () => {
    expect(projectQueryOptions("user-1", "project-1", async () => workspace)).not.toHaveProperty(
      "initialData",
    );
    expect(projectScreen).toContain("if (query.isPending) return <LoadingState");
    expect(projectScreen).toContain("query.isError && !query.data");
    expect(projectScreen).toContain('copyKey="legacy.9529cfcb39d7"');
  });
});

describe("NXR-031 Community reconciliation", () => {
  const active = {
    id: "channel-1",
    joined: true,
    eligible: true,
    membershipStatus: "active",
  } as OfficialChannel;
  const message = { id: "message-1", body: "canonical" } as CommunityMessage;
  test("cached shell still requires canonical active membership", () => {
    expect(hasActiveOfficialMembership(active)).toBe(true);
    expect(hasActiveOfficialMembership({ ...active, joined: false })).toBe(false);
    expect(communityScreen).toContain("!channel || !membershipActive");
  });
  test("existing messages survive background reconciliation failures", async () => {
    const qc = client();
    const key = queryKeys.communityMessages("channel-1");
    const cached = { pages: [[message]], pageParams: [undefined] };
    qc.setQueryData(key, cached);
    await qc
      .fetchQuery({
        queryKey: key,
        queryFn: async () => {
          throw new Error("offline");
        },
      })
      .catch(() => undefined);
    expect(qc.getQueryData(key)).toEqual(cached);
    expect(communityScreen).toContain("messages.isError && !messages.data");
  });
  test("realtime invalidation does not fabricate messages", () => {
    expect(communityHooks).toContain(
      "invalidateQueries({ queryKey: queryKeys.communityMessages(channelId) })",
    );
    expect(communityHooks).not.toContain("setQueryData");
  });
});

describe("NXR-031 request and invalidation boundaries", () => {
  test("independently safe authoritative project reads start in parallel", () => {
    expect(workspaceService).toContain(
      "const [projectResult, tasksResult, checkInsResult] = await Promise.allSettled([",
    );
    expect(workspaceService).toContain("if (!data) return null");
  });
  test("ordinary mutations stay targeted while verified execution remains complete", () => {
    const keys = taskMutationInvalidations(" project-1 ").map((key) => JSON.stringify(key));
    expect(keys).toContain(JSON.stringify(queryKeys.project("project-1")));
    expect(keys).not.toContain(JSON.stringify(queryKeys.community));
    for (const required of [
      queryKeys.tasks,
      queryKeys.journeys,
      queryKeys.momentum,
      queryKeys.arena,
    ])
      expect(verifiedExecutionInvalidations).toContain(required);
  });
  test("cached errors use non-blocking states", () => {
    expect(communityScreen).toContain("channels.isError && !channels.data");
    expect(communityScreen).toContain("messages.isError && !messages.data");
    expect(communityScreen).toContain('copyKey="legacy.9027acc44a84"');
  });
});
