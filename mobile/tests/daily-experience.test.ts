import assert from "node:assert/strict";
import test from "node:test";
import {
  getDailyActions,
  getWeeklyChallenge,
  getWeekKey,
} from "../lib/daily-experience";
import {
  getDisplayEntitlement,
  getDisplayPlan,
  getDisplayProjectStatus,
} from "../lib/presentation";
import type { Project, Subject, Task } from "../services/workspace-service";

const now = new Date(2026, 7, 20, 12);
const task = (id: string, dueDate: string | null, completed = false, updatedAt?: string): Task => ({
  id,
  title: id,
  description: "",
  priority: "medium",
  dueDate,
  projectId: null,
  completed,
  updatedAt: updatedAt ?? null,
});
const project = (id: string): Project => ({ id, title: id, description: "", status: "active" });
const subject = (id: string): Subject => ({ id, name: id, description: "", status: "active", color: "#fff" });

test("week key is stable Monday through Sunday and changes on Monday", () => {
  assert.equal(getWeekKey(new Date(2026, 7, 17, 1)), "2026-08-17");
  assert.equal(getWeekKey(new Date(2026, 7, 23, 23)), "2026-08-17");
  assert.equal(getWeekKey(new Date(2026, 7, 24, 0)), "2026-08-24");
});

test("daily actions prioritize real overdue and today context and remain capped", () => {
  const actions = getDailyActions(
    [task("late", "2026-08-19"), task("today", "2026-08-20")],
    [project("empty-project")],
    [subject("Matemática")],
    now,
  );
  assert.deepEqual(actions.map(({ id }) => id), ["overdue", "today", "project-empty-project"]);
  assert.equal(actions.length, 3);
});

test("weekly challenge is deterministic and progress uses completions updated this week", () => {
  const tasks = [
    task("done", null, true, "2026-08-18T10:00:00.000Z"),
    task("old", null, true, "2026-08-10T10:00:00.000Z"),
    task("one", null),
    task("two", null),
    task("three", null),
  ];
  const first = getWeeklyChallenge(tasks, "user-1", now);
  const second = getWeeklyChallenge([...tasks].reverse(), "user-1", now);
  assert.deepEqual(first, second);
  assert.equal(first?.key, "2026-08-17:user-1:tasks");
  assert.equal(first?.completed, 1);
  assert.equal(first?.target, 4);
});

test("weekly challenge is omitted without enough measurable task data", () => {
  assert.equal(getWeeklyChallenge([task("only", null)], "user-1", now), null);
  assert.equal(getWeeklyChallenge([task("a", null), task("b", null), task("c", null)], "", now), null);
});

test("technical project, plan, and entitlement values are presented in PT-BR", () => {
  assert.equal(getDisplayProjectStatus("active"), "Em andamento");
  assert.equal(getDisplayProjectStatus("completed"), "Concluído");
  assert.equal(getDisplayProjectStatus("archived"), "Arquivado");
  assert.equal(getDisplayPlan("free"), "Gratuito");
  assert.equal(getDisplayPlan("premium"), "Premium");
  assert.equal(getDisplayEntitlement("active"), "Ativo");
});
