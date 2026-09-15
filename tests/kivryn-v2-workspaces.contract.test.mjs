import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("web Assistant, Tasks, and Projects keep the current KIVRYN visual vocabulary", async () => {
  const paths = [
    "src/routes/_shell.assistant.tsx",
    "src/routes/_shell.productivity.tsx",
    "src/routes/_shell.projects.tsx",
    "src/routes/_shell.projects.$projectId.tsx",
  ];
  const sources = await Promise.all(paths.map(read));

  // Assistant now uses the approved focused chat surface: history lives in a
  // side sheet, the composer/conversation owns the main canvas, and the old
  // multi-panel Intelligence workspace is intentionally gone.
  assert.match(sources[0], /<Sheet open=\{historyOpen\}/);
  assert.match(sources[0], /Mensagem para a KIVRYN/);
  assert.match(sources[0], /max-w-3xl/);
  assert.doesNotMatch(sources[0], /KIVRYN Intelligence/);
  assert.doesNotMatch(sources[0], /lg:grid-cols-\[280px_minmax/);

  assert.match(sources[1], /PageShell/);
  assert.match(sources[1], /TaskService\.createTask/);
  assert.match(sources[1], /rounded-full/);
  assert.match(sources[2], /PageShell/);
  assert.match(sources[2], /ProjectService\.create/);
  assert.match(sources[3], /bg-intelligence/);
  for (const [index, source] of sources.entries()) {
    assert.doesNotMatch(source, /(?:text|bg|border|from|to|via)-gold/, paths[index]);
  }
});

test("native core workspaces use current official KIVRYN primitives", async () => {
  const [assistantEntry, assistantChat, tasks, projects, primitives] = await Promise.all([
    read("mobile/app/(app)/(tabs)/assistant.tsx"),
    read("mobile/app/(app)/(tabs)/assistant-chat.tsx"),
    read("mobile/app/(app)/(tabs)/productivity.tsx"),
    read("mobile/app/(app)/(tabs)/projects/index.tsx"),
    read("mobile/components/v2/premium-ui.tsx"),
  ]);

  // The Assistant tab intentionally redirects straight into the focused chat.
  // The real chat surface owns history, attachments, voice and confirmed actions.
  assert.match(assistantEntry, /Redirect href="\/\(app\)\/\(tabs\)\/assistant-chat"/);
  assert.match(assistantChat, /useConversations\(\)/);
  assert.match(assistantChat, /visible=\{historyOpen\}/);
  assert.match(assistantChat, /uploadChatAttachment/);
  assert.match(assistantChat, /applyNexoraAction/);

  assert.match(tasks, /StandardHeader/);
  assert.match(tasks, /NativeFormModal/);
  assert.match(projects, /StandardHeader/);
  assert.match(projects, /NativeFormModal/);
  assert.match(primitives, /accessibilityRole="progressbar"/);
});
