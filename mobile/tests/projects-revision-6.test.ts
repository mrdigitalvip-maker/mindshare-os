import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { workspaceMutationError } from "../lib/mutation-errors";

const listSource = readFileSync("app/(app)/(tabs)/projects/index.tsx", "utf8");
const detailSource = readFileSync("app/(app)/projects/[projectId].tsx", "utf8");
const serviceSource = readFileSync("services/workspace-service.ts", "utf8");
const modalSource = readFileSync("components/native-form-modal.tsx", "utf8");
const hooksSource = readFileSync("hooks/use-workspaces.ts", "utf8");

test("project list treats tasks as recoverable auxiliary data", () => {
  assert.match(listSource, /if \(projectsQuery\.isError\)/);
  assert.doesNotMatch(listSource, /projectsQuery\.isError \|\| tasksQuery\.isError/);
  assert.match(listSource, /Não foi possível atualizar o progresso das tarefas\./);
  assert.match(listSource, /tasksQuery\.refetch\(\)/);
  assert.match(listSource, /tasks=\{taskDataAvailable \?/);
});

test("manual project creation is guarded and waits for a canonical backend id", () => {
  assert.match(listSource, /submitting\.current \|\| createProject\.isPending/);
  assert.match(listSource, /await createProject\.mutateAsync/);
  assert.match(listSource, /if \(!id\)/);
  assert.ok(
    listSource.indexOf("setOpen(false)") > listSource.indexOf("await createProject.mutateAsync"),
  );
  assert.match(listSource, /objective: description/);
});

test("project and embedded task dates use the shared native date field", () => {
  assert.match(modalSource, /<NativeDateField/);
  assert.doesNotMatch(modalSource, /keyboardType="numbers-and-punctuation"/);
  assert.doesNotMatch(listSource + detailSource, /AAAA-MM-DD/);
});

test("project detail reads identity directly and owner-scopes related reads", () => {
  const detailRead =
    serviceSource.match(
      /export async function getProject[\s\S]*?export async function listProjectCheckIns/,
    )?.[0] ?? "";
  assert.match(detailRead, /\.from\("projects"\)/);
  assert.match(detailRead, /\.eq\("id", id\)/);
  assert.match(detailRead, /\.eq\("user_id", user\)/);
  assert.doesNotMatch(detailRead, /listProjects/);
  assert.match(detailRead, /Promise\.allSettled/);
  assert.match(detailRead, /tasksUnavailable/);
  assert.match(detailRead, /checkInsUnavailable/);
});

test("workspace mutations have synchronous guards and human check-in labels", () => {
  assert.match(detailSource, /taskSubmitting\.current/);
  assert.match(detailSource, /projectSubmitting\.current/);
  assert.match(detailSource, /checkInSubmitting\.current/);
  assert.match(detailSource, /completingTasks\.current\.has/);
  assert.match(detailSource, /Preciso reorganizar/);
  assert.doesNotMatch(detailSource, /latestCheckIn\.note \|\| latestCheckIn\.state/);
});

test("delete copy follows FK restriction and invalidates execution consumers", () => {
  assert.match(detailSource, /não pode ser excluído até que elas sejam movidas ou removidas/);
  assert.match(
    workspaceMutationError({ code: "23503", message: "foreign key constraint" }).message,
    /possui tarefas/,
  );
  const deletion = hooksSource.match(/const deleteProject[\s\S]*?const checkIn/)?.[0] ?? "";
  for (const key of ["projects", "tasks", "journeys", "dailyMission"])
    assert.match(deletion, new RegExp(`queryKeys\\.${key}`));
});

test("Free project and task limits retain canonical PT-BR mapping", () => {
  assert.equal(
    workspaceMutationError({
      message: "FREE_CREATION_LIMIT_REACHED",
      details: '{"resource":"projects"}',
    }).message,
    "O plano gratuito permite até 3 projetos ativos.",
  );
  assert.equal(
    workspaceMutationError({
      message: "FREE_CREATION_LIMIT_REACHED",
      details: '{"resource":"tasks"}',
    }).message,
    "O plano gratuito permite até 30 tarefas abertas.",
  );
});

test("R5 and manual projects share the canonical objective model", () => {
  assert.match(
    serviceSource,
    /select\("id,title,description,objective,status,due_date,updated_at"\)/,
  );
  assert.match(detailSource, /project\.objective \|\| project\.description/);
  assert.match(serviceSource, /status !== undefined && !\["active", "completed"\]/);
});
