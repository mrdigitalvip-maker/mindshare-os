import assert from "node:assert/strict";
import test from "node:test";
import { taskMutationInvalidations } from "../lib/query-keys";
import {
  buildTaskAssistantContext,
  getTaskActivity,
  getFocusTask,
  getRescheduleDate,
  getTaskAttentionSummary,
  getTaskCounts,
  getTaskDisplayData,
  getTaskDuePresentation,
  getTaskExecutionState,
  getTaskNudge,
  getTaskNextActionState,
  getTaskStaleness,
  getTaskRhythmState,
  getTaskProgressSummary,
  getTaskNotificationEligibility,
  getTaskWorkState,
  getTaskPriorityLabel,
  groupTasksForExecution,
  sortTasksForExecution,
  getTasksForQueue,
} from "../lib/task-selectors";
import type { Project, Task } from "../services/workspace-service";
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
    ["Sem prazo", "Atrasada há 1 dia", "Hoje", "Amanhã", "Em 2 dias"],
  );
  assert.equal(getTaskExecutionState(task("done", null, true), now), "completed");
});
test("project reassignment invalidates both project workspaces", () => {
  assert.deepEqual(taskMutationInvalidations("project-b", "project-a"), [
    ["tasks"],
    ["projects"],
    ["journeys"],
    ["journeys", "daily-mission"],
    ["projects", "project-b"],
    ["tasks", "project", "project-b"],
    ["projects", "project-a"],
    ["tasks", "project", "project-a"],
  ]);
});

test("focus follows overdue, today, upcoming and undated execution order", () => {
  const values = [
    task("loose", null),
    task("future", "2026-08-22", false, "high"),
    task("today", "2026-08-20"),
    task("late", "2026-08-19", false, "low"),
  ];
  assert.equal(getFocusTask(values, now)?.id, "late");
  assert.equal(getFocusTask(values.slice(0, 3), now)?.id, "today");
  assert.equal(getFocusTask(values.slice(0, 2), now)?.id, "future");
  assert.equal(getFocusTask([values[0]], now)?.id, "loose");
  assert.equal(getFocusTask([], now), null);
});

test("priority orders focus candidates with the same deadline state", () => {
  assert.equal(
    getFocusTask(
      [task("low", "2026-08-20", false, "low"), task("high", "2026-08-20", false, "high")],
      now,
    )?.id,
    "high",
  );
});

test("a persisted next action outranks ordinary upcoming work", () => {
  const actionable = { ...task("action", null), nextAction: "Enviar o orçamento" };
  assert.equal(getFocusTask([task("ordinary", "2026-08-21"), actionable], now)?.id, "action");
});

test("active queues exclude completed tasks and duplicate ids", () => {
  const duplicate = task("same", "2026-08-19");
  assert.deepEqual(
    getTasksForQueue(
      [duplicate, { ...duplicate, title: "duplicate" }, task("done", null, true)],
      "overdue",
      now,
    ).map(({ id }) => id),
    ["same"],
  );
  assert.deepEqual(getTasksForQueue([task("done", "2026-08-20", true)], "today", now), []);
});

test("counts and attention are derived from actual task state", () => {
  const values = [
    task("late", "2026-08-19"),
    task("today", "2026-08-20"),
    task("future", "2026-08-21"),
    task("loose", null),
    task("done", null, true),
  ];
  assert.deepEqual(getTaskCounts(values, now), {
    open: 4,
    overdue: 1,
    today: 1,
    upcoming: 1,
    undated: 1,
    completed: 1,
  });
  assert.deepEqual(getTaskAttentionSummary(values, [], now), [
    "1 tarefa está atrasada.",
    "1 tarefa vence hoje.",
    "Há uma tarefa sem prazo.",
  ]);
});

test("attention reports real project concentration and display linkage", () => {
  const project: Project = { id: "p", title: "Lançamento", description: "", status: "active" };
  const values = [1, 2, 3, 4].map((value) => ({ ...task(String(value), null), projectId: "p" }));
  assert.ok(
    getTaskAttentionSummary(values, [project], now).includes(
      "O projeto “Lançamento” concentra 4 tarefas pendentes.",
    ),
  );
  assert.equal(getTaskDisplayData(values[0], [project]).project?.title, "Lançamento");
});

test("reschedule choices use local calendar dates", () => {
  assert.equal(getRescheduleDate("tomorrow", now), "2026-08-21");
  assert.equal(getRescheduleDate("three-days", now), "2026-08-23");
  assert.equal(getRescheduleDate("next-week", now), "2026-08-27");
});

test("execution state, next action and blockers are truthful", () => {
  const active = {
    ...task("active", null),
    executionStatus: "in_progress" as const,
    nextAction: "Abrir o rascunho",
    lastProgressAt: "2026-08-15T12:00:00Z",
  };
  assert.equal(getTaskWorkState(active), "in_progress");
  assert.equal(getTaskNextActionState(active), "defined");
  assert.equal(getTaskStaleness(active, now), 5);
  assert.match(getTaskNudge(active, now), /sem progresso há 5 dias/);
  const blocked = {
    ...active,
    executionStatus: "blocked" as const,
    blockerNote: "Aguardando fotos",
  };
  assert.equal(getTaskWorkState(blocked), "blocked");
  assert.match(getTaskNudge(blocked, now), /bloqueio registrado/);
  assert.deepEqual(getTaskAttentionSummary([blocked], [], now), [
    "1 tarefa está bloqueada.",
    "Há uma tarefa sem prazo.",
  ]);
  assert.equal(getTaskNextActionState(task("missing", null)), "missing");
});

test("completion overrides stale active execution state", () => {
  const inconsistent = { ...task("done", null, true), executionStatus: "in_progress" as const };
  assert.equal(getTaskWorkState(inconsistent), "completed");
  assert.equal(getFocusTask([inconsistent], now), null);
});

test("rhythm uses only execution timestamps and respects lifecycle precedence", () => {
  assert.equal(getTaskRhythmState(task("new", null), now), "not_started");
  assert.equal(
    getTaskRhythmState(
      { ...task("today", null), executionStatus: "in_progress", startedAt: "2026-08-20T08:00:00" },
      now,
    ),
    "started_today",
  );
  assert.equal(
    getTaskRhythmState(
      {
        ...task("recent", null),
        executionStatus: "in_progress",
        lastProgressAt: "2026-08-19T12:00:00",
      },
      now,
    ),
    "active_recently",
  );
  assert.equal(
    getTaskRhythmState(
      {
        ...task("stale", null),
        executionStatus: "in_progress",
        lastProgressAt: "2026-08-15T12:00:00",
        updatedAt: "2026-08-20T12:00:00",
      },
      now,
    ),
    "stale",
  );
  assert.equal(
    getTaskRhythmState({ ...task("blocked", "2026-08-01"), executionStatus: "blocked" }, now),
    "blocked",
  );
  assert.equal(getTaskRhythmState(task("late", "2026-08-19"), now), "overdue");
  assert.equal(getTaskRhythmState(task("done", "2026-08-01", true), now), "completed");
});

test("progress copy and activity never infer work from updatedAt", () => {
  assert.equal(
    getTaskProgressSummary({ ...task("active", null), lastProgressAt: "2026-08-19T12:00:00" }, now),
    "Último progresso: ontem",
  );
  assert.deepEqual(
    getTaskActivity({ ...task("edited", null), updatedAt: "2026-08-20T10:00:00" }),
    [],
  );
  assert.deepEqual(
    getTaskActivity({
      ...task("active", null),
      startedAt: "2026-08-18T10:00:00",
      lastProgressAt: "2026-08-19T10:00:00",
    }).map(({ kind }) => kind),
    ["progress", "started"],
  );
});

test("notification readiness exposes facts without scheduling anything", () => {
  assert.deepEqual(
    getTaskNotificationEligibility(
      {
        ...task("blocked", "2026-08-21"),
        executionStatus: "blocked",
        reminderAt: "2026-08-20T18:00:00Z",
      },
      now,
    ),
    {
      explicitReminder: true,
      overdue: false,
      staleInProgress: false,
      unresolvedBlocker: true,
      dueSoon: true,
    },
  );
});

test("assistant context is bounded, real and preserves confirmation contract", () => {
  const context = buildTaskAssistantContext(
    {
      ...task("a", "2026-08-21"),
      title: "Enviar proposta",
      nextAction: "Revisar preço",
      blockerNote: "Aguardando jurídico",
      executionStatus: "blocked",
    },
    { id: "p", title: "Lançamento", description: "Publicar o produto", status: "active" },
  );
  assert.match(context, /Preview → Confirmar → Aplicar/);
  assert.match(context, /Estado: blocked/);
  assert.match(context, /Projeto: Lançamento/);
  assert.ok(context.length < 2500);
});

test("blocked tasks are attention, not an unactionable focus item", () => {
  const blocked = {
    ...task("blocked", "2026-08-01", false, "high"),
    executionStatus: "blocked" as const,
    blockerNote: "Dependência",
  };
  const actionable = { ...task("action", "2026-08-20"), nextAction: "Telefonar" };
  assert.equal(getFocusTask([blocked, actionable], now)?.id, "action");
  assert.match(getTaskAttentionSummary([blocked, actionable], [], now)[0], /bloqueada/);
});
