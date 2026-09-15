import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const webPath = new URL("../src/routes/_shell.assistant.tsx", import.meta.url);
const mobileEntryPath = new URL("../mobile/app/(app)/(tabs)/assistant.tsx", import.meta.url);
const mobileChatPath = new URL("../mobile/app/(app)/(tabs)/assistant-chat.tsx", import.meta.url);

test("web assistant keeps history in a side sheet and prioritizes one chat surface", async () => {
  const source = await readFile(webPath, "utf8");
  assert.match(source, /setHistoryOpen\(true\)/);
  assert.match(source, /<Sheet open=\{historyOpen\}/);
  assert.match(source, /Mensagem para a KIVRYN/);
  assert.match(source, /max-w-3xl/);
  assert.doesNotMatch(source, /lg:grid-cols-\[280px_minmax/);
  assert.doesNotMatch(source, /Intelligence layer/);
});

test("mobile assistant opens directly in chat and keeps history off the main surface", async () => {
  const [entry, chat] = await Promise.all([
    readFile(mobileEntryPath, "utf8"),
    readFile(mobileChatPath, "utf8"),
  ]);
  assert.match(entry, /Redirect href="\/\(app\)\/\(tabs\)\/assistant-chat"/);
  assert.match(chat, /<Modal/);
  assert.match(chat, /visible=\{historyOpen\}/);
  assert.match(chat, /useConversations\(\)/);
  assert.match(chat, /assistantMessage/);
  assert.match(chat, /userMessage/);
  assert.match(chat, /uploadChatAttachment/);
  assert.match(chat, /applyNexoraAction/);
});
