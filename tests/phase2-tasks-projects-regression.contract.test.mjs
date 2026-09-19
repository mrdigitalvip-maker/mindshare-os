import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const workspace = read("src/services/workspace-services.ts");
const tasksRoute = read("src/routes/_shell.productivity.tsx");
const projectsRoute = read("src/routes/_shell.projects.tsx");
const mobileErrors = read("mobile/lib/mutation-errors.ts");
const webErrors = read("src/lib/mutation-errors.ts");

test("Tasks detached toggle mutation no longer depends on this binding", () => {
  assert.match(tasksRoute, /mutationFn:\s*TaskService\.toggleTask/);
  assert.doesNotMatch(workspace, /return this\.listTasks\(\)/);
  assert.match(workspace, /return ProductivityService\.listTasks\(\)/);
});

test("Projects preserve the canonical backend Free limit instead of masking it", () => {
  assert.match(projectsRoute, /workspaceMutationError\(error\)\.message/);
  assert.match(webErrors, /FREE_CREATION_LIMIT_REACHED/);
  assert.match(webErrors, /O plano gratuito permite até 3 projetos ativos\./);
  assert.doesNotMatch(
    projectsRoute,
    /onError:\s*\(\)\s*=>\s*toast\.error\("Não foi possível criar o projeto"\)/,
  );
});

test("Projects continue to create through the canonical ProjectService only", () => {
  assert.match(projectsRoute, /ProjectService\.create\(/);
  assert.doesNotMatch(projectsRoute, /mock/i);
  assert.doesNotMatch(projectsRoute, /supabase\.from\("projects"\)/);
});

test("Web and Android expose the same project Free-limit contract", () => {
  assert.match(mobileErrors, /FREE_CREATION_LIMIT_REACHED/);
  assert.match(webErrors, /FREE_CREATION_LIMIT_REACHED/);
  assert.match(mobileErrors, /projects:\s*"O plano gratuito permite até 3 projetos ativos\."/);
  assert.match(webErrors, /projects:\s*"O plano gratuito permite até 3 projetos ativos\."/);
});
