import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const studies = await readFile(
  new URL("../src/routes/_shell.studies.$subjectId.tsx", import.meta.url),
  "utf8",
);

test("Studies overview opens the session recorder through controlled React state", () => {
  assert.match(studies, /const \[activeTab, setActiveTab\] = useState\(["']overview["']\)/);
  assert.match(studies, /<Tabs value=\{activeTab\} onValueChange=\{setActiveTab\}/);
  assert.match(studies, /onClick=\{\(\) => setActiveTab\(["']sessions["']\)\}/);
  assert.doesNotMatch(studies, /document\.querySelector<.*data-value=sessions/);
});
