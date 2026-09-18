import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const routeTree = read("src/routeTree.gen.ts");

const parents = [
  {
    path: "src/routes/_shell.documents.tsx",
    base: "/documents",
    childParent: "getParentRoute: () => ShellDocumentsRoute",
  },
  {
    path: "src/routes/_shell.content.tsx",
    base: "/content",
    childParent: "getParentRoute: () => ShellContentRoute",
  },
  {
    path: "src/routes/_shell.finance.tsx",
    base: "/finance",
    childParent: "getParentRoute: () => ShellFinanceRoute",
  },
  {
    path: "src/routes/_shell.studio.tsx",
    base: "/studio",
    childParent: "getParentRoute: () => ShellStudioRoute",
  },
  {
    path: "src/routes/auth.tsx",
    base: "/auth",
    childParent: "getParentRoute: () => AuthRoute",
  },
];

for (const parent of parents) {
  test(`${parent.base} parent renders its generated child routes through Outlet`, () => {
    const source = read(parent.path);
    assert.match(source, /\bOutlet\b/);
    assert.match(source, /useRouterState/);
    assert.match(source, new RegExp(`pathname !== "${parent.base.replace("/", "\\/")}"`));
    assert.match(source, /<Outlet \/>/);
    assert.ok(routeTree.includes(parent.childParent));
  });
}

test("already-hardened nested workspaces keep their Outlet routing", () => {
  for (const path of [
    "src/routes/_shell.agents.tsx",
    "src/routes/_shell.community.tsx",
    "src/routes/_shell.projects.tsx",
    "src/routes/_shell.studies.tsx",
    "src/routes/_shell.journeys.tsx",
    "src/routes/_shell.packs.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /\bOutlet\b/);
    assert.match(source, /<Outlet \/>/);
  }
});
