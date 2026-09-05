import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("web localization keeps preference and dictionaries in parity", async () => {
  const source = await read("src/i18n/index.ts");
  assert.match(source, /"system" \| "pt-BR" \| "en"/);
  assert.match(source, /nexora\.web\.ui-language\.v1/);
  const en = source.match(/en: \{([\s\S]*?)\n  \},\n  "pt-BR"/)?.[1] ?? "";
  const pt = source.match(/"pt-BR": \{([\s\S]*?)\n  \},\n\} as const/)?.[1] ?? "";
  const keys = (dictionary) =>
    [...dictionary.matchAll(/^    "([^"]+)":/gm)].map((match) => match[1]).sort();
  assert.deepEqual(keys(en), keys(pt));
});

test("system locale resolves Portuguese families and defaults to English", async () => {
  const source = await read("src/i18n/index.ts");
  assert.match(source, /locale\.toLowerCase\(\) === "pt"/);
  assert.match(source, /locale\.toLowerCase\(\)\.startsWith\("pt-"\)/);
  assert.match(source, /: "en"/);
});

test("command shell exposes only real release routes and accessible controls", async () => {
  const [shell, modules, tree] = await Promise.all([
    read("src/routes/_shell.tsx"),
    read("src/lib/modules.ts"),
    read("src/routeTree.gen.ts"),
  ]);
  for (const id of [
    "dashboard",
    "assistant",
    "projects",
    "productivity",
    "studies",
    "journeys",
    "creator",
    "community",
    "arena",
    "premium",
    "settings",
  ]) {
    assert.ok(shell.includes(`"${id}"`), id);
  }
  assert.match(shell, /aria-label=\{t\("shell\.searchLabel"\)\}/);
  assert.match(shell, /SIDEBAR_STORAGE_KEY/);
  for (const path of [...modules.matchAll(/path: "([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => path !== "/search")) {
    assert.ok(tree.includes(path), path);
  }
});

test("language changes update document metadata without reload", async () => {
  const provider = await read("src/providers/language-provider.tsx");
  assert.match(provider, /document\.documentElement\.lang = resolvedLocale/);
  assert.match(provider, /window\.localStorage\.setItem\(LANGUAGE_STORAGE_KEY, value\)/);
  assert.doesNotMatch(provider, /window\.location\.reload/);
});
