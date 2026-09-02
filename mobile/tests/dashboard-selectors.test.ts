import assert from "node:assert/strict";
import test from "node:test";
import {
  getNextAction,
  getHomeContextMessage,
  getHomeDaySummary,
  getHomeProjects,
  getOverdueTasks,
  getProjectProgress,
  getTodayTasks,
  getUpcomingTasks,
} from "../lib/dashboard-selectors";
import type { Project, Task } from "../services/workspace-service";

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

test("home context is deterministic for overdue, today, calm, and no-action states", () => {
  assert.equal(
    getHomeContextMessage({ overdue: 1, pending: 2 }, true),
    "Há uma tarefa atrasada pedindo atenção.",
  );
  assert.equal(
    getHomeContextMessage({ overdue: 0, pending: 2 }, true),
    "Você tem uma ação importante para hoje.",
  );
  assert.equal(
    getHomeContextMessage({ overdue: 0, pending: 0 }, true),
    "Seu próximo passo está definido.",
  );
  assert.equal(
    getHomeContextMessage({ overdue: 0, pending: 0 }, false),
    "Seu dia está leve. Podemos planejar o que vem depois.",
  );
});

test("day progress only measures tasks whose due date is the local today", () => {
  assert.deepEqual(
    getHomeDaySummary(
      [task("done", "2026-08-20", true), task("open", "2026-08-20"), task("old", "2026-08-19")],
      now,
    ),
    {
      completed: 1,
      pending: 1,
      total: 2,
      overdue: 1,
      percentage: 50,
    },
  );
  assert.equal(getHomeDaySummary([], now).percentage, null);
});

test("home project ranking favors actionable work, is stable, and remains capped", () => {
  const projects: Project[] = ["empty", "pending", "late", "today"].map((id) => ({
    id,
    title: id,
    description: "",
    status: "active",
  }));
  const linked = [
    task("pending-task", null),
    task("late-task", "2026-08-19"),
    task("today-task", "2026-08-20"),
  ];
  linked[0].projectId = "pending";
  linked[1].projectId = "late";
  linked[2].projectId = "today";
  assert.deepEqual(
    getHomeProjects(projects, linked, now, 3).map(({ id }) => id),
    ["late", "today", "pending"],
  );
  assert.deepEqual(
    getHomeProjects([...projects].reverse(), linked, now, 3).map(({ id }) => id),
    ["late", "today", "pending"],
  );
});
