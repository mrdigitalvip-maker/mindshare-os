import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("web Assistant, Tasks, and Projects keep the current KIVRYN visual vocabulary", async () => {
  const paths = [
    "src/routes/_shell.assistant.tsx",
    "src/routes/_shell.productivity.tsx",
    "src/routes/_shell.projects.tsx",
    "src/routes/_shell.projects.$projectId.tsx",
  ];
  const sources = await Promise.all(paths.map(read));
  assert.match(sources[0], /v2-workspace/);
  assert.match(sources[0], /KIVRYN Intelligence/);
  assert.match(sources[1], /PageShell/);
  assert.match(sources[1], /TaskService\.createTask/);
  assert.match(sources[1], /rounded-full/);
  assert.match(sources[2], /PageShell/);
  assert.match(sources[2], /ProjectService\.create/);
  assert.match(sources[3], /bg-intelligence/);
  for (const [index, source] of sources.entries()) {
    assert.doesNotMatch(source, /(?:text|bg|border|from|to|via)-gold/, paths[index]);
  }
});

test("native core workspaces use current official KIVRYN primitives", async () => {
  const [assistant, tasks, projects, primitives] = await Promise.all([
    read("mobile/app/(app)/(tabs)/assistant.tsx"),
    read("mobile/app/(app)/(tabs)/productivity.tsx"),
    read("mobile/app/(app)/(tabs)/projects/index.tsx"),
    read("mobile/components/v2/premium-ui.tsx"),
  ]);
  assert.match(assistant, /KivrynCore/);
  assert.match(assistant, /MenuButton/);
  assert.match(tasks, /StandardHeader/);
  assert.match(tasks, /NativeFormModal/);
  assert.match(projects, /StandardHeader/);
  assert.match(projects, /NativeFormModal/);
  assert.match(primitives, /accessibilityRole="progressbar"/);
});
