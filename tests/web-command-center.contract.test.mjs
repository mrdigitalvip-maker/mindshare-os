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

test("phase two keeps a substantial bilingual product vocabulary", async () => {
  const source = await read("src/i18n/index.ts");
  const en = source.match(/en: \{([\s\S]*?)\n  \},\n  "pt-BR"/)?.[1] ?? "";
  const keys = [...en.matchAll(/^    "([^"]+)":/gm)].map((match) => match[1]);
  assert.ok(keys.length >= 100, `expected at least 100 keys, received ${keys.length}`);
  for (const namespace of ["auth", "assistant", "creator", "projects", "tasks", "studies"])
    assert.ok(
      keys.some((key) => key.startsWith(`${namespace}.`)),
      namespace,
    );
});

test("critical route workspaces use the shared language provider", async () => {
  for (const path of [
    "src/routes/auth.tsx",
    "src/routes/_shell.projects.tsx",
    "src/routes/_shell.productivity.tsx",
    "src/routes/_shell.studies.tsx",
    "src/routes/_shell.journeys.tsx",
    "src/routes/_shell.creator.tsx",
    "src/routes/_shell.community.tsx",
    "src/routes/_shell.documents.tsx",
    "src/routes/_shell.finance.tsx",
    "src/routes/_shell.translate.tsx",
    "src/routes/_shell.settings.tsx",
  ]) {
    const source = await read(path);
    assert.match(source, /useLanguage/, path);
  }
});

test("Creator remains wired to real resources without analytics fixtures", async () => {
  const creator = await read("src/routes/_shell.creator.tsx");
  assert.match(creator, /listCreatorResources/);
  assert.match(creator, /creator_manual_metric_snapshots/);
  assert.match(creator, /createCreatorVideoProject/);
  assert.doesNotMatch(creator, /fakeAnalytics|demoAnalytics|mockAnalytics/i);
});

test("the route audit covers auth, detail routes and truthful data states", async () => {
  const matrix = await read("docs/web-route-matrix.md");
  for (const route of [
    "`/dashboard`",
    "`/assistant`",
    "`/projects/:projectId`",
    "`/creator`",
    "`/auth`",
  ]) {
    assert.ok(matrix.includes(route), route);
  }
  assert.match(matrix, /no route below introduces synthetic product data/i);
});

test("KIVRYN V2 command center uses shared semantic visual foundations", async () => {
  const [styles, dashboard, webFoundation, nativeTheme, nativeFoundation] = await Promise.all([
    read("src/styles.css"),
    read("src/routes/_shell.dashboard.tsx"),
    read("src/components/dashboard/v2-command-ui.tsx"),
    read("mobile/lib/theme.ts"),
    read("mobile/components/v2/premium-ui.tsx"),
  ]);
  for (const token of ["--intelligence", "--intelligence-blue", "--intelligence-violet"])
    assert.ok(styles.includes(token), token);
  assert.match(dashboard, /CommandSectionHeading/);
  assert.match(webFoundation, /role=\{error \? "alert" : "status"\}/);
  for (const token of ["canvasElevated", "surfaceRaised", "borderActive", "textSecondary"])
    assert.ok(nativeTheme.includes(token), token);
  assert.match(nativeFoundation, /accessibilityRole="progressbar"/);
  assert.match(nativeFoundation, /LocalizedCopy/);
});
