import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const creatorPath = new URL("../src/routes/_shell.creator.tsx", import.meta.url);
const atmospherePath = new URL("../src/components/module-atmosphere.tsx", import.meta.url);

test("E21 makes the Creator source workspace the primary workflow", async () => {
  const source = await readFile(creatorPath, "utf8");
  assert.match(source, /Create from the source, not the clutter\./);
  assert.match(source, /Source workspace/);
  assert.match(source, /Paste a video source/);
  assert.match(source, /Upload original/);
  assert.match(source, /Creator pipeline/);
  assert.match(source, /Real clip library/);

  const sourceWorkspace = source.indexOf('id="media"');
  const profileSetup = source.indexOf('id="setup"');
  assert.ok(sourceWorkspace >= 0 && profileSetup >= 0 && sourceWorkspace < profileSetup);
});

test("E21 moves secondary Creator surfaces behind progressive disclosure", async () => {
  const source = await readFile(creatorPath, "utf8");
  assert.match(source, /<details id="setup"/);
  assert.match(source, /<details id="strategy"/);
  assert.match(source, /<details id="analytics"/);
  assert.match(source, /Creator Academy/);
  assert.match(source, /Provider-verified analytics/);
  assert.match(source, /Manual observations only/);
  assert.doesNotMatch(source, /fake chart|fixture chart|sample chart|mock metric/i);
});

test("E21 removes the obstructive interactive Creator atmosphere overlay", async () => {
  const source = await readFile(atmospherePath, "utf8");
  assert.match(source, /pointer-events-none/);
  assert.match(source, /if \(!creator\) return null/);
  assert.doesNotMatch(source, /<a\b/);
  assert.doesNotMatch(source, /pointer-events-auto/);
  assert.doesNotMatch(source, /CREATOR SIGNAL/);
  assert.doesNotMatch(source, /Kivi Creator/);
});
