import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("secondary web modules use the shared KIVRYN V2 visual vocabulary", async () => {
  const paths = [
    "src/routes/_shell.arena.tsx",
    "src/routes/_shell.community.tsx",
    "src/routes/_shell.creator.tsx",
    "src/routes/_shell.documents.tsx",
    "src/routes/_shell.finance.tsx",
    "src/routes/_shell.packs.tsx",
    "src/routes/_shell.studio.tsx",
  ];
  const sources = await Promise.all(paths.map(read));

  assert.match(sources[0], /WorkspaceProgress/);
  assert.match(sources[1], /v2-surface/);
  assert.match(sources[2], /creator-studio/);
  assert.match(sources[3], /v2-surface/);
  assert.match(sources[4], /v2-surface/);
  assert.match(sources[5], /WorkspaceShell/);
  assert.match(sources[6], /studio-shell/);
  for (const [index, source] of sources.entries()) {
    assert.doesNotMatch(source, /(?:text|bg|border|from|to|via)-gold/, paths[index]);
  }
});

test("shared route states announce loading, error, and empty states", async () => {
  const source = await read("src/components/parity-state.tsx");
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /role="status"/);
  assert.match(source, /v2-surface/);
});

test("native creator workbench uses the established dark V2 tokens", async () => {
  const source = await read("mobile/components/creator-workspace.tsx");
  assert.match(source, /colors\.surfaceRaised/);
  assert.match(source, /colors\.borderActive/);
  assert.match(source, /minHeight: 48/);
  assert.doesNotMatch(source, /gold|warm/i);
});
