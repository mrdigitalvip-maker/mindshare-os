import assert from "node:assert/strict";
import test from "node:test";
import {
  getProjectAttention,
  getProjectNextAction,
  getProjectOverdueTasks,
  getProjectProgress,
  getProjectStatusLabel,
  getProjectTodayTasks,
  groupTasksByProject,
  sortProjectsByAttention,
} from "../lib/project-selectors";
import type { Project, Task } from "../services/workspace-service";

const now = new Date(2026, 7, 20, 12);
const task = (id: string, projectId: string | null, dueDate: string | null, completed = false): Task => ({
  id, projectId, dueDate, completed, title: id, description: "", priority: "medium",
});
const project = (id: string, status = "active"): Project => ({ id, status, title: id, description: "" });

test("groups only linked tasks by project", () => {
  const grouped = groupTasksByProject([task("a", "one", null), task("b", "one", null), task("c", null, null)]);
  assert.deepEqual(grouped.get("one")?.map(({ id }) => id), ["a", "b"]);
  assert.equal(grouped.size, 1);
});

test("calculates real progress and returns neutral state for zero tasks", () => {
  assert.deepEqual(getProjectProgress([task("a", "one", null, true), task("b", "one", null)]), { completed: 1, total: 2, ratio: 0.5 });
  assert.equal(getProjectProgress([]), null);
});

test("selects overdue and today linked task collections", () => {
  const tasks = [task("old", "one", "2026-08-19"), task("today", "one", "2026-08-20"), task("done", "one", "2026-08-19", true)];
  assert.deepEqual(getProjectOverdueTasks(tasks, now).map(({ id }) => id), ["old"]);
  assert.deepEqual(getProjectTodayTasks(tasks, now).map(({ id }) => id), ["today"]);
});

test("next action prefers overdue, today, upcoming, then undated", () => {
  const undated = task("undated", "one", null);
  const upcoming = task("upcoming", "one", "2026-08-21");
  const today = task("today", "one", "2026-08-20");
  const overdue = task("overdue", "one", "2026-08-19");
  assert.equal(getProjectNextAction([undated, upcoming, today, overdue], now)?.id, "overdue");
  assert.equal(getProjectNextAction([undated, upcoming, today], now)?.id, "today");
  assert.equal(getProjectNextAction([undated, upcoming], now)?.id, "upcoming");
  assert.equal(getProjectNextAction([undated], now)?.id, "undated");
});

test("sorts overdue, today, moving, no-next, then completed deterministically", () => {
  const projects = [project("complete", "completed"), project("empty"), project("moving"), project("today"), project("late")];
  const grouped = groupTasksByProject([
    task("late-task", "late", "2026-08-19"), task("today-task", "today", "2026-08-20"), task("moving-task", "moving", "2026-08-21"),
  ]);
  assert.deepEqual(sortProjectsByAttention(projects, grouped, now).map(({ id }) => id), ["late", "today", "moving", "empty", "complete"]);
  assert.equal(getProjectAttention(project("done", "completed"), [], now), "Concluído");
});

test("presents stored project statuses in PT-BR without changing unknown values", () => {
  assert.equal(getProjectStatusLabel("active"), "Em andamento");
  assert.equal(getProjectStatusLabel("paused"), "Pausado");
  assert.equal(getProjectStatusLabel("completed"), "Concluído");
  assert.equal(getProjectStatusLabel("archived"), "Arquivado");
  assert.equal(getProjectStatusLabel("custom"), "custom");
});
