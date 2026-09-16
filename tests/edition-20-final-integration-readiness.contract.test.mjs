import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("E20 keeps every release-ready root module backed by a route file", async () => {
  const modules = await read("src/lib/modules.ts");
  const releaseModules = [
    ...modules.matchAll(
      /id:\s*"([^"]+)"[\s\S]*?releaseReady:\s*true[\s\S]*?path:\s*"\/([^"]+)"/g,
    ),
  ].map((match) => ({ id: match[1], route: match[2] }));

  assert.ok(releaseModules.length >= 10, "release allowlist should not silently collapse");
  for (const module of releaseModules) {
    await access(new URL(`../src/routes/_shell.${module.route}.tsx`, import.meta.url));
  }
});

test("E20 wires Agent run deep-link, builder reset, and settings refresh/error handling", async () => {
  const [listRoute, detailRoute] = await Promise.all([
    read("src/routes/_shell.agents.tsx"),
    read("src/routes/_shell.agents.$agentId.tsx"),
  ]);

  assert.match(listRoute, /search=\{\{ tab: "run" \} as never\}/);
  assert.match(listRoute, /const resetAndClose = \(\) =>/);
  assert.match(listRoute, /setStep\(1\)/);
  assert.match(listRoute, /setForm\(emptyAgentForm\(\)\)/);
  assert.match(detailRoute, /validateSearch:/);
  assert.match(detailRoute, /const \{ tab \} = Route\.useSearch\(\)/);
  assert.match(detailRoute, /defaultValue=\{tab \?\? "overview"\}/);
  assert.match(detailRoute, /onSaved=\{async \(\) =>/);
  assert.match(detailRoute, /onError: \(error: Error\) => toast\.error\(error\.message\)/);
});

test("E20 keeps recovery and failure feedback on Studies and Challenges", async () => {
  const [studies, challenges] = await Promise.all([
    read("src/routes/_shell.studies.tsx"),
    read("src/routes/_shell.challenges.tsx"),
  ]);

  assert.match(studies, /Go to dashboard/);
  assert.match(studies, /nav\(\{ to: "\/dashboard" \}\)/);
  assert.match(challenges, /Não foi possível encerrar o desafio\./);
  assert.match(challenges, /Challenge could not be ended\./);
});
