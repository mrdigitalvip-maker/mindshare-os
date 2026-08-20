import assert from "node:assert/strict";
import test from "node:test";
import {
  getNextAction,
  getOverdueTasks,
  getProjectProgress,
  getTodayTasks,
  getUpcomingTasks,
} from "../lib/dashboard-selectors";
import type { Task } from "../services/workspace-service";

const now = new Date(2026, 7, 20, 12);
const task = (id: string, dueDate: string | null, completed = false): Task => ({
  id,
  title: id,
  description: "",
  priority: "medium",
  dueDate,
  projectId: null,
  completed,
});

test("selects only incomplete overdue tasks in earliest-first order", () => {
  assert.deepEqual(
    getOverdueTasks(
      [
        task("yesterday", "2026-08-19"),
        task("older", "2026-08-01"),
        task("done", "2026-08-10", true),
      ],
      now,
    ).map(({ id }) => id),
    ["older", "yesterday"],
  );
});

test("selects incomplete tasks due today", () => {
  assert.deepEqual(
    getTodayTasks(
      [
        task("today", "2026-08-20"),
        task("tomorrow", "2026-08-21"),
        task("done", "2026-08-20", true),
      ],
      now,
    ).map(({ id }) => id),
    ["today"],
  );
});

test("selects upcoming tasks nearest-first", () => {
  assert.deepEqual(
    getUpcomingTasks([task("later", "2026-09-01"), task("next", "2026-08-21")], now).map(
      ({ id }) => id,
    ),
    ["next", "later"],
  );
});

test("next action prefers overdue, then today, then upcoming", () => {
  const tasks = [
    task("upcoming", "2026-08-21"),
    task("today", "2026-08-20"),
    task("overdue", "2026-08-19"),
  ];
  assert.equal(getNextAction(tasks, now)?.id, "overdue");
  assert.equal(getNextAction(tasks.slice(0, 2), now)?.id, "today");
  assert.equal(getNextAction(tasks.slice(0, 1), now)?.id, "upcoming");
});
test("project progress is derived from real related tasks and absent with no tasks", () => {
  const tasks = [task("one", null, true), task("two", null), task("other", null)];
  tasks[0].projectId = tasks[1].projectId = "project";
  tasks[2].projectId = "other";
  assert.deepEqual(getProjectProgress("project", tasks), {
    completed: 1,
    total: 2,
    percentage: 50,
  });
  assert.equal(getProjectProgress("empty", tasks), null);
});
