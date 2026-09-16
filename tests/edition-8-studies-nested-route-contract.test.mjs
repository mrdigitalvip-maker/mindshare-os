import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [studiesRoute, routeTree] = await Promise.all([
  readFile(new URL("../src/routes/_shell.studies.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/routeTree.gen.ts", import.meta.url), "utf8"),
]);

test("Studies parent yields to the subject workspace on nested routes", () => {
  assert.match(studiesRoute, /Outlet/);
  assert.match(studiesRoute, /useRouterState/);
  assert.match(studiesRoute, /pathname !== ["']\/studies["']/);
  assert.match(studiesRoute, /<Outlet\s*\/>/);
  assert.match(studiesRoute, /<StudiesIndex\s*\/>/);
});

test("generated route tree keeps subject workspaces nested under Studies", () => {
  assert.match(routeTree, /ShellStudiesSubjectIdRouteImport/);
  assert.match(routeTree, /getParentRoute:\s*\(\) => ShellStudiesRoute/);
});
