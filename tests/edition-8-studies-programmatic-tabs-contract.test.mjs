import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [tabs, studies] = await Promise.all([
  readFile(new URL("../src/components/ui/tabs.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/routes/_shell.studies.$subjectId.tsx", import.meta.url), "utf8"),
]);

test("programmatic TabsTrigger clicks synthesize the mouse-down Radix uses for selection", () => {
  assert.match(tabs, /event\.detail !== 0/);
  assert.match(tabs, /new MouseEvent\(["']mousedown["']/);
  assert.match(tabs, /data-value=\{value\}/);
});

test("Studies Iniciar registro targets the Sessions trigger", () => {
  assert.match(studies, /data-value=sessions/);
  assert.match(studies, /Iniciar registro/);
});
