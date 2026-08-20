import assert from "node:assert/strict";
import test from "node:test";
import { taskMutationInvalidations } from "../lib/query-keys";
import {
  getTaskDuePresentation,
  getTaskExecutionState,
  getTaskPriorityLabel,
  groupTasksForExecution,
  sortTasksForExecution,
} from "../lib/task-selectors";
import type { Task } from "../services/workspace-service";
const now = new Date(2026, 7, 20, 12);
const task = (
  id: string,
  dueDate: string | null,
  completed = false,
  priority = "medium",
  title = id,
): Task => ({ id, title, description: "", priority, dueDate, projectId: null, completed });
test("groups execution states without overlap", () => {
  const groups = groupTasksForExecution(
    [
      task("late", "2026-08-19"),
      task("today", "2026-08-20"),
      task("next", "2026-08-21"),
      task("loose", null),
      task("done", "2026-08-20", true),
    ],
    now,
  );
  assert.deepEqual(
    groups.overdue.map(({ id }) => id),
    ["late"],
  );
  assert.deepEqual(
    groups.today.map(({ id }) => id),
    ["today"],
  );
  assert.deepEqual(
    groups.upcoming.map(({ id }) => id),
    ["next"],
  );
  assert.deepEqual(
    groups.undated.map(({ id }) => id),
    ["loose"],
  );
  assert.deepEqual(
    groups.completed.map(({ id }) => id),
    ["done"],
  );
});
test("sorts by due date, supported priority, title and stable id", () => {
  const values = [
    task("z", null, false, "low", "Same"),
    task("b", "2026-08-21", false, "low", "Same"),
    task("a", "2026-08-21", false, "low", "Same"),
    task("high", "2026-08-21", false, "high", "Later title"),
  ];
  assert.deepEqual(
    sortTasksForExecution(values).map(({ id }) => id),
    ["high", "a", "b", "z"],
  );
});
test("presents known priorities and preserves unknown stored values", () => {
  assert.deepEqual(["high", "medium", "low", "custom"].map(getTaskPriorityLabel), [
    "Alta",
    "Média",
    "Baixa",
    "custom",
  ]);
});
test("presents dates with local-calendar execution semantics", () => {
  assert.deepEqual(
    [null, "2026-08-19", "2026-08-20", "2026-08-21", "2026-08-22"].map((due) =>
      getTaskDuePresentation(task(String(due), due), now),
    ),
    ["Sem data", "Atrasada", "Hoje", "Amanhã", "22 ago"],
  );
  assert.equal(getTaskExecutionState(task("done", null, true), now), "completed");
});
test("project reassignment invalidates both project workspaces", () => {
  assert.deepEqual(taskMutationInvalidations("project-b", "project-a"), [
    ["tasks"],
    ["projects"],
    ["projects", "project-b"],
    ["tasks", "project", "project-b"],
    ["projects", "project-a"],
    ["tasks", "project", "project-a"],
  ]);
});
