import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("web Assistant, Tasks, and Projects extend the KIVRYN V2 vocabulary", async () => {
  const paths = [
    "src/routes/_shell.assistant.tsx",
    "src/routes/_shell.productivity.tsx",
    "src/routes/_shell.projects.tsx",
    "src/routes/_shell.projects.$projectId.tsx",
  ];
  const sources = await Promise.all(paths.map(read));
  assert.match(sources[0], /v2-workspace/);
  assert.match(sources[0], /KIVRYN Intelligence/);
  assert.match(sources[1], /v2-surface/);
  assert.match(sources[2], /v2-workspace-header/);
  assert.match(sources[3], /bg-intelligence/);
  for (const [index, source] of sources.entries()) {
    assert.doesNotMatch(source, /(?:text|bg|border|from|to|via)-gold/, paths[index]);
  }
});

test("native productivity surfaces reuse the official V2 primitives", async () => {
  const [assistant, tasks, projects, primitives] = await Promise.all([
    read("mobile/app/(app)/(tabs)/assistant.tsx"),
    read("mobile/app/(app)/(tabs)/productivity.tsx"),
    read("mobile/app/(app)/(tabs)/projects/index.tsx"),
    read("mobile/components/v2/premium-ui.tsx"),
  ]);
  assert.match(assistant, /PremiumSurface illuminated/);
  assert.match(tasks, /PremiumSurface/);
  assert.match(projects, /V2Progress/);
  assert.match(primitives, /accessibilityRole="progressbar"/);
});
