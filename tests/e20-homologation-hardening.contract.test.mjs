import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const assistantPath = new URL("../src/routes/_shell.assistant.tsx", import.meta.url);
const searchPath = new URL("../src/services/search-service.ts", import.meta.url);
const landingPath = new URL("../src/routes/index.tsx", import.meta.url);
const rootPath = new URL("../src/routes/__root.tsx", import.meta.url);
const sitemapPath = new URL("../src/routes/sitemap[.]xml.ts", import.meta.url);

test("Assistant new-chat control is observable and clears stale conversation URLs", async () => {
  const source = await readFile(assistantPath, "utf8");
  assert.match(source, /aria-label="Novo chat"/);
  assert.match(source, /search:\s*\{ conversation: undefined \}/);
  assert.match(source, /replace:\s*true/);
  assert.match(source, /toast\.success\("Novo chat iniciado"\)/);
});

test("Global Search degrades per source instead of failing the entire search", async () => {
  const source = await readFile(searchPath, "utf8");
  assert.match(source, /function rowsOrEmpty/);
  assert.match(source, /return result\.error \? \[\] : \(result\.data \?\? \[\]\)/);
  assert.doesNotMatch(source, /queries\.find\(\(result\) => result\.error\)/);
  assert.match(source, /\.\.\.rowsOrEmpty\(projects\)\.map/);
  assert.match(source, /\.\.\.rowsOrEmpty\(studioLessons\)\.map/);
});

test("public search identity exposes canonical metadata, icon and a real sitemap", async () => {
  const [landing, root, sitemap] = await Promise.all([
    readFile(landingPath, "utf8"),
    readFile(rootPath, "utf8"),
    readFile(sitemapPath, "utf8"),
  ]);
  assert.match(landing, /rel: "canonical", href: "https:\/\/kivryn\.co\/"/);
  assert.match(landing, /property: "og:url", content: "https:\/\/kivryn\.co\/"/);
  assert.match(root, /BRAND_ICON_URL = "https:\/\/kivryn\.co\/icon-512\.png"/);
  assert.match(root, /"@type": "SoftwareApplication"/);
  assert.match(root, /"@type": "Organization"/);
  assert.match(sitemap, /createFileRoute\("\/sitemap\.xml"\)/);
  assert.match(sitemap, /path: "\/about"/);
  assert.match(sitemap, /path: "\/privacy"/);
  assert.match(sitemap, /path: "\/terms"/);
});
