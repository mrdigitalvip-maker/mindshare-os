import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("web projects stay focused on canonical project operations", async () => {
  const source = await read("src/routes/_shell.projects.tsx");

  for (const contract of [
    "ProjectService.list",
    "ProjectService.create",
    "TaskService.listTasks",
    "Pesquisar projetos",
    "Tudo",
    "Ativos",
    "Concluídos",
    "Criar projeto",
    'to: "/projects/$projectId"',
    "params: { projectId: project.id }",
  ]) assert.ok(source.includes(contract), contract);

  assert.match(source, /const navigate = useNavigate\(\)/);
  assert.doesNotMatch(source, /PROJECT OPERATING SYSTEM/);
  assert.doesNotMatch(source, /INTELIGÊNCIA KIVRYN/);
  assert.doesNotMatch(source, /CONEXÕES/);
  assert.doesNotMatch(source, /v2-surface/);
});

test("mobile projects keep real create navigation and project/task context", async () => {
  const source = await read("mobile/app/(app)/(tabs)/projects/index.tsx");

  for (const contract of [
    "useProjects()",
    "useTasks()",
    "useWorkspaceMutations()",
    "createProject.mutateAsync",
    "NativeFormModal",
    "Pesquisar projetos",
    '"all"',
    '"active"',
    '"completed"',
    "router.push(`/projects/${project.id}`)",
    "router.push(`/projects/${id}`)",
  ]) assert.ok(source.includes(contract), contract);

  assert.doesNotMatch(source, /getProjectsOverview/);
  assert.doesNotMatch(source, /PROJECT OPERATING SYSTEM/);
  assert.doesNotMatch(source, /INTELIGÊNCIA KIVRYN/);
  assert.doesNotMatch(source, /Connections Hub/);
  assert.doesNotMatch(source, /V2Progress/);
});
