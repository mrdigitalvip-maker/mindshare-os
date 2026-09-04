import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getLatestProjectActivity, getProjectHealthState } from "../lib/project-selectors";
import type { Project, ProjectCheckIn, Task } from "../services/workspace-service";

const project = {
  id: "project-1",
  title: "Lançamento",
  description: "",
  objective: "Publicar o produto",
  status: "active",
  dueDate: "2026-09-10",
  updatedAt: "2026-09-01T12:00:00Z",
} as Project;
const task = (patch: Partial<Task>): Task =>
  ({
    id: "task-1",
    title: "Validar release",
    completed: false,
    projectId: project.id,
    dueDate: null,
    startedAt: null,
    lastProgressAt: null,
    executionStatus: null,
    blockerNote: null,
    ...patch,
  }) as Task;

test("R8 project health is derived from persisted task state", () => {
  assert.equal(
    getProjectHealthState(project, [task({ executionStatus: "blocked" })], new Date("2026-09-02")),
    "blocked",
  );
  assert.equal(getProjectHealthState(project, [], new Date("2026-09-02")), "needs_plan");
});

test("R8 recent activity selects the latest real execution event", () => {
  const checkIn = {
    id: "check-1",
    projectId: project.id,
    state: "unchanged",
    note: "Dependência ainda em análise",
    createdAt: "2026-09-02T10:00:00Z",
  } as ProjectCheckIn;
  const latest = getLatestProjectActivity(
    [task({ startedAt: "2026-09-01T10:00:00Z", lastProgressAt: "2026-09-02T09:00:00Z" })],
    [checkIn],
  );
  assert.equal(latest?.checkIn?.id, checkIn.id);
  assert.equal(latest?.label, "Check-in: Sem mudança");
  assert.equal(getLatestProjectActivity([task({})], []), null);
});

test("R8 UI keeps auxiliary failures inline and exposes execution CTAs", () => {
  const list = readFileSync("app/(app)/(tabs)/projects/index.tsx", "utf8");
  const detail = readFileSync("app/(app)/projects/[projectId].tsx", "utf8");
  assert.match(list, /Agir agora/);
  assert.match(list, /Abrir workspace/);
  assert.match(detail, /copyKey="legacy\.373fee33d0de"/);
  assert.match(detail, /checkInsUnavailable/);
  assert.match(detail, /tasksUnavailable/);
});
