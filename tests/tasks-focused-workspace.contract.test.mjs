import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("web tasks stay focused on real task operations", async () => {
  const source = await read("src/routes/_shell.productivity.tsx");

  for (const contract of [
    "TaskService.listTasks",
    "TaskService.createTask",
    "TaskService.toggleTask",
    "TaskService.updateTask",
    "TaskService.removeTask",
    "ProjectService.list",
    "Pesquisar tarefas",
    "Criar uma tarefa",
    "Comece agora",
  ]) assert.ok(source.includes(contract), contract);

  assert.doesNotMatch(source, /EXECUTION SYSTEM/);
  assert.doesNotMatch(source, /INTELIGÊNCIA KIVRYN/);
  assert.doesNotMatch(source, /CALENDAR READY/);
});

test("mobile tasks keep create edit complete delete and project context", async () => {
  const source = await read("mobile/app/(app)/(tabs)/productivity.tsx");

  for (const contract of [
    "useTasks()",
    "useProjects()",
    'action: "create"',
    'action: "update"',
    'action: "delete"',
    "NativeFormModal",
    "Criar uma tarefa",
    "Comece agora",
    "router.push(`/tasks/${item.id}`)",
    "router.push(`/projects/${item.projectId}`)",
  ]) assert.ok(source.includes(contract), contract);

  assert.doesNotMatch(source, /getTaskAttentionSummary/);
  assert.doesNotMatch(source, /getFocusTask/);
  assert.doesNotMatch(source, /CALENDAR READY/);
});
