import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspace = readFileSync(
  new URL("../src/services/workspace-services.ts", import.meta.url),
  "utf8",
);
const financeRoute = readFileSync(
  new URL("../src/routes/_shell.finance.tsx", import.meta.url),
  "utf8",
);

test("workspace service objects do not depend on JavaScript this binding", () => {
  assert.doesNotMatch(workspace, /\bthis\./);
});

test("Finance summary remains safe when React Query receives a detached method", () => {
  assert.match(financeRoute, /queryFn:\s*FinanceService\.getSummary/);
  assert.match(
    workspace,
    /const \[transactions, accounts\] = await Promise\.all\(\[\s*FinanceService\.listTransactions\(\),\s*FinanceService\.listAccounts\(\),?\s*\]\)/s,
  );
});

test("Projects, Content, Studies and Agents use explicit service references for composed methods", () => {
  assert.match(workspace, /ProjectService\.list\(\)/);
  assert.match(workspace, /ContentService\.listDrafts\(\)/);
  assert.match(workspace, /StudyService\.listHistory\(\)/);
  assert.match(workspace, /AgentService\.listRows\(\)/);
});
