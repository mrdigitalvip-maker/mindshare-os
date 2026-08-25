import assert from "node:assert/strict";
import test from "node:test";
import {
  getProjectAttention,
  getProjectDeadlineState,
  getProjectHealthSummary,
  getProjectNextAction,
  getProjectOverdueTasks,
  getProjectProgress,
  getProjectsOverview,
  getProjectStatusLabel,
  getProjectTodayTasks,
  groupTasksByProject,
  sortProjectsByAttention,
} from "../lib/project-selectors";
import type { Project, Task } from "../services/workspace-service";

const now = new Date("2026-08-20T12:00:00Z");
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

test("sorts overdue, today, no-next, moving, then completed deterministically", () => {
  const projects = [project("complete", "completed"), project("empty"), project("moving"), project("today"), project("late")];
  const grouped = groupTasksByProject([
    task("late-task", "late", "2026-08-19"), task("today-task", "today", "2026-08-20"), task("moving-task", "moving", "2026-08-21"),
  ]);
  assert.deepEqual(sortProjectsByAttention(projects, grouped, now).map(({ id }) => id), ["late", "today", "empty", "moving", "complete"]);
  assert.equal(getProjectAttention(project("done", "completed"), [], now), "Concluído");
});

test("presents stored project statuses in PT-BR without changing unknown values", () => {
  assert.equal(getProjectStatusLabel("active"), "Em andamento");
  assert.equal(getProjectStatusLabel("paused"), "Pausado");
  assert.equal(getProjectStatusLabel("completed"), "Concluído");
  assert.equal(getProjectStatusLabel("archived"), "Arquivado");
  assert.equal(getProjectStatusLabel("custom"), "custom");
});

test("reports due-soon deadlines only for active projects", () => {
  assert.equal(getProjectDeadlineState({ ...project("soon"), dueDate: "2026-08-27" }, now), "approaching");
  assert.equal(getProjectDeadlineState({ ...project("done", "completed"), dueDate: "2026-08-19" }, now), "none");
  assert.equal(getProjectDeadlineState({ ...project("archived", "archived"), dueDate: "2026-08-19" }, now), "none");
});

test("builds truthful health and overview counts from task data", () => {
  const projects = [project("empty"), project("healthy"), { ...project("soon"), dueDate: "2026-08-25" }];
  const grouped = groupTasksByProject([
    task("healthy-task", "healthy", "2026-09-01"),
    task("soon-a", "soon", null),
    task("soon-b", "soon", null),
  ]);
  assert.deepEqual(getProjectHealthSummary(projects[0], [], now), ["Este projeto não possui uma próxima tarefa definida."]);
  assert.deepEqual(getProjectsOverview(projects, grouped, now), { attention: 2, approaching: 1, actionable: 2 });
});

test("counts multiple overdue tasks and ranks attention ahead of healthy work", () => {
  const projects = [project("healthy"), project("late")];
  const grouped = groupTasksByProject([
    task("healthy-task", "healthy", "2026-09-01"),
    task("late-a", "late", "2026-08-18"),
    task("late-b", "late", "2026-08-19"),
  ]);
  assert.equal(getProjectOverdueTasks(grouped.get("late") ?? [], now).length, 2);
  assert.deepEqual(sortProjectsByAttention(projects, grouped, now).map(({ id }) => id), ["late", "healthy"]);
});

test("removes duplicate project and task IDs from rendering data", () => {
  const duplicate = task("same-task", "same-project", null);
  const grouped = groupTasksByProject([duplicate, duplicate]);
  assert.equal(grouped.get("same-project")?.length, 1);
  assert.equal(sortProjectsByAttention([project("same-project"), project("same-project")], grouped, now).length, 1);
});
