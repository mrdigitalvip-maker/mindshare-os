import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("signup explains KIVRYN before a new user commits to an account", async () => {
  const auth = await read("src/routes/auth.tsx");

  assert.match(auth, /resolvedLocale === "pt-BR"/);
  assert.match(auth, /Não é só um chat de IA/);
  assert.match(auth, /It is not just an AI chat/);
  assert.match(auth, /Think with context/);
  assert.match(auth, /Turn goals into action/);
  assert.match(auth, /mode === "signup"/);
  assert.match(auth, /lg:hidden/);
});

test("an empty authenticated workspace gets a truthful guided starting path", async () => {
  const dashboard = await read("src/routes/_shell.dashboard.tsx");

  assert.match(dashboard, /const discoveryReady =/);
  assert.match(dashboard, /const showDiscovery =/);
  assert.match(dashboard, /projects\.data\?\.length/);
  assert.match(dashboard, /tasks\.data\?\.length/);
  assert.match(dashboard, /studies\.data\?\.length/);
  assert.match(dashboard, /journeys\.data\?\.length/);
  assert.match(dashboard, /KIVRYN transforma intenção em progresso real/);
  assert.match(dashboard, /KIVRYN turns intention into real progress/);
  for (const route of ["/assistant", "/projects", "/studies", "/journeys"])
    assert.ok(dashboard.includes(`to: "${route}" as const`), route);
});

test("discovery never replaces real workspace content or error states", async () => {
  const dashboard = await read("src/routes/_shell.dashboard.tsx");

  for (const guard of [
    "!projects.isError",
    "!tasks.isError",
    "!studies.isError",
    "!journeys.isError",
  ])
    assert.ok(dashboard.includes(guard), guard);
  assert.match(dashboard, /<DailyMissionCard \/>/);
  assert.match(dashboard, /<WorkLink/);
});
