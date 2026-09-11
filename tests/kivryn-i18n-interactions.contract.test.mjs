import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("web locale restoration is deterministic and storage failures are non-fatal", () => {
  const provider = read("src/providers/language-provider.tsx");
  assert.match(provider, /validPreference\(stored\) \? stored : "system"/);
  assert.match(provider, /navigator\.languages\?\.length/);
  assert.match(provider, /localStorage\.getItem[\s\S]*?catch/);
  assert.match(provider, /localStorage\.setItem[\s\S]*?catch/);
});

test("translation lookup falls back to English and exposes unknown keys", () => {
  const i18n = read("src/i18n/index.ts");
  assert.match(i18n, /messages\[locale\] \?\? messages\.en/);
  assert.match(i18n, /selected\[key\] \?\? messages\.en\[key\]/);
  assert.match(i18n, /`\[missing:\$\{String\(key\)\}\]`/);
});

test("mobile waits for persisted language before mounting visible routes", () => {
  const provider = read("mobile/providers/language-provider.tsx");
  assert.match(provider, /AsyncStorage\.getItem\(LANGUAGE_STORAGE_KEY\)/);
  assert.match(provider, /if \(!ready\) return null/);
});

test("documents workspace localizes the complete screen and guards repeated mutations", () => {
  const route = read("src/routes/_shell.documents.tsx");
  for (const key of [
    "documents.loading",
    "documents.loadError",
    "documents.new",
    "documents.deleteConfirm",
    "documents.databaseHelp",
    "documents.updatedSuccess",
  ]) {
    assert.match(route, new RegExp(`t\\(\\"${key.replace(".", "\\.")}\\"`));
  }
  assert.match(route, /disabled=\{duplicate\.isPending\}/);
  assert.match(route, /disabled=\{remove\.isPending\}/);
  assert.match(route, /key=\{editing === undefined \? "closed"/);
  assert.doesNotMatch(route, />\s*(?:New document|Loading documents|Try again|Cancel|Save)\s*</);
});
