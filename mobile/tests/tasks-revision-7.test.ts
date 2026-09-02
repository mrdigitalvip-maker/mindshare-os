import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { workspaceMutationError } from "../lib/mutation-errors";
import {
  buildTaskAssistantContext,
  getFocusTask,
  getTaskRhythmLabel,
  getTasksForQueue,
} from "../lib/task-selectors";
import type { Task } from "../services/workspace-service";

const service = readFileSync("services/workspace-service.ts", "utf8");
const hooks = readFileSync("hooks/use-workspaces.ts", "utf8");
const detail = readFileSync("app/(app)/tasks/[taskId].tsx", "utf8");
const list = readFileSync("app/(app)/(tabs)/productivity.tsx", "utf8");

const task = (id: string, status: Task["executionStatus"] = "not_started"): Task => ({
  id,
  title: id,
  description: "",
  priority: "medium",
  dueDate: null,
  projectId: null,
  completed: status === "completed",
  executionStatus: status,
});

test("detail uses an owner-scoped canonical single-task read", () => {
  const read =
    service.match(/export async function getTask[\s\S]*?export async function createTask/)?.[0] ??
    "";
  assert.match(read, /\.from\("tasks"\)/);
  assert.match(read, /\.eq\("id", resource\(taskId\)\)/);
  assert.match(read, /\.eq\("user_id", owner\(userId\)\)/);
  assert.match(read, /\.maybeSingle\(\)/);
  assert.match(hooks, /export function useTask\(taskId: string\)/);
  assert.match(detail, /useTask\(taskId\)/);
  assert.doesNotMatch(detail, /useTasks\(/);
});

test("project failures remain auxiliary in list and detail", () => {
  assert.match(list, /if \(tasksQuery\.isError\)/);
  assert.match(list, /Não foi possível atualizar os projetos vinculados/);
  assert.match(detail, /projectQuery\.isError/);
  assert.match(detail, /Não foi possível carregar o projeto vinculado/);
  assert.match(detail, /task\.projectId == null[\s\S]*?"Sem projeto"/);
  assert.match(detail, /projectQuery\.isPending[\s\S]*?"Projeto vinculado…"/);
  assert.match(detail, /"Projeto vinculado indisponível"/);
});

test("duplicate completion only emits success after a saved canonical mutation", () => {
  const completion = detail.match(/const complete = \(\) =>[\s\S]*?const reopen/)?.[0] ?? "";
  assert.match(completion, /if \(!saved\) return;/);
  assert.ok(completion.indexOf("if (!saved) return") < completion.indexOf("cancelTaskReminder"));
  assert.ok(
    completion.indexOf("cancelTaskReminder") <
      completion.indexOf('Alert.alert(\n          "Concluída."'),
  );
});

test("queues are unique and focus excludes blocked and completed tasks", () => {
  const blocked = task("blocked", "blocked");
  const completed = task("completed", "completed");
  const open = task("open");
  assert.equal(getFocusTask([blocked, completed, open])?.id, "open");
  assert.deepEqual(
    getTasksForQueue([open, open, completed], "undated").map(({ id }) => id),
    ["open"],
  );
});

test("creation and execution inputs are normalized and guarded", () => {
  assert.match(service, /normalizeTaskTitle\(input\.title\)/);
  assert.match(service, /normalizePriority\(input\.priority\)/);
  assert.match(service, /assertOwnedProject\(userId, input\.projectId\)/);
  assert.match(list, /saveGuard\.current \|\| mutateTask\.isPending/);
  assert.match(detail, /operationGuards\.current\.has\(operation\)/);
  assert.doesNotMatch(detail, /lastProgressAt: new Date\(\)\.toISOString\(\),\s*reminderAt: null/);
});

test("reminder persistence failure compensates local scheduling", () => {
  assert.ok(detail.indexOf("scheduleTaskReminder") < detail.indexOf("update({ reminderAt: at }"));
  assert.match(detail, /catch \(persistError\)[\s\S]*cancelTaskReminder/);
  assert.ok(
    detail.indexOf("update({ reminderAt: at }") < detail.indexOf('Alert.alert("Lembrete definido"'),
  );
});

test("task copy is natural PT-BR and native dates are shared", () => {
  assert.doesNotMatch(detail, /NEXORA NOW|replaceAll\("_"/);
  assert.match(detail, /NEXORA AGORA/);
  assert.equal(getTaskRhythmLabel("active_recently"), "Avanço recente");
  assert.doesNotMatch(detail + list, /AAAA-MM-DD/);
  assert.match(detail + list, /NativeFormModal/);
});

test("assistant context prefers canonical project objective", () => {
  const context = buildTaskAssistantContext(task("Executar"), {
    id: "project",
    title: "Projeto",
    description: "fallback",
    objective: "Objetivo canônico",
    status: "active",
  });
  assert.match(context, /Objetivo canônico/);
  assert.doesNotMatch(context, /fallback/);
  assert.doesNotMatch(context, /project/);
});

test("free open-task limit has canonical copy", () => {
  assert.equal(
    workspaceMutationError({
      message: "FREE_CREATION_LIMIT_REACHED",
      details: '{"resource":"tasks"}',
    }).message,
    "O plano gratuito permite até 30 tarefas em aberto.",
  );
});
