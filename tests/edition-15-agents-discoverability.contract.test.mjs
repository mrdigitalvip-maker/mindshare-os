import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("E15 exposes Agents through the release navigation", async () => {
  const [modules, shell] = await Promise.all([
    read("src/lib/modules.ts"),
    read("src/routes/_shell.tsx"),
  ]);

  assert.match(
    modules,
    /id:\s*"agents"[\s\S]*?releaseReady:\s*true[\s\S]*?path:\s*"\/agents"/,
    "Agents must be part of RELEASE_MODULES",
  );
  assert.match(
    shell,
    /modules:\s*\["dashboard",\s*"assistant",\s*"agents",\s*"search"\]/,
    "Agents must be discoverable in the Command group",
  );
});

test("E15 keeps list and detail routes wired into the generated route tree", async () => {
  const [listRoute, detailRoute, routeTree] = await Promise.all([
    read("src/routes/_shell.agents.tsx"),
    read("src/routes/_shell.agents.$agentId.tsx"),
    read("src/routeTree.gen.ts"),
  ]);

  assert.match(listRoute, /createFileRoute\("\/_shell\/agents"\)/);
  assert.match(detailRoute, /createFileRoute\("\/_shell\/agents\/\$agentId"\)/);
  assert.match(routeTree, /_shell\.agents/);
  assert.match(routeTree, /_shell\.agents\.\$agentId/);
});
