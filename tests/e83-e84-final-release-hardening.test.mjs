import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const freeLimits = read("supabase/migrations/202608270002_free_limits_and_task_invariants.sql");
const assistantQuota = read("supabase/migrations/202608270001_assistant_atomic_quotas.sql");
const agentPremium = read("supabase/migrations/202609180018_phase2_agent_premium_entitlement.sql");
const webErrors = read("src/lib/mutation-errors.ts");
const mobileErrors = read("mobile/lib/mutation-errors.ts");
const projects = read("src/routes/_shell.projects.tsx");
const projectDetail = read("src/routes/_shell.projects.$projectId.tsx");
const productivity = read("src/routes/_shell.productivity.tsx");
const studies = read("src/routes/_shell.studies.tsx");
const studyDetail = read("src/routes/_shell.studies.$subjectId.tsx");
const journeysService = read("src/services/parity-service.ts");
const webPremium = read("src/routes/_shell.premium.tsx");
const mobilePremium = read("mobile/app/(app)/premium.tsx");
const languageProvider = read("src/providers/language-provider.tsx");
const runtimeErrors = read("src/services/runtime-error-service.ts");

test("E83 keeps canonical Free workspace caps server-authoritative", () => {
  assert.match(freeLimits, /resource := 'projects'; cap := 3/);
  assert.match(freeLimits, /resource := 'study_subjects'; cap := 3/);
  assert.match(freeLimits, /resource := 'journeys'; cap := 1/);
  assert.match(freeLimits, /if amount >= 30 then/);
  assert.match(freeLimits, /if public\.has_premium\(new\.user_id\) then return new/);
});

test("E83 Web and Android expose the same human Free-limit messages", () => {
  for (const message of [
    "O plano gratuito permite até 3 projetos ativos.",
    "O plano gratuito permite até 30 tarefas em aberto.",
    "O plano gratuito permite até 3 matérias ativas.",
    "O plano gratuito permite apenas 1 Journey ativa.",
  ]) {
    assert.ok(webErrors.includes(message), `missing web message: ${message}`);
    assert.ok(mobileErrors.includes(message), `missing mobile message: ${message}`);
  }
  assert.match(webErrors, /FREE_CREATION_LIMIT_REACHED/);
  assert.match(mobileErrors, /FREE_CREATION_LIMIT_REACHED/);
});

test("E83 workspace routes surface mapped mutation errors instead of raw backend codes", () => {
  for (const source of [projects, projectDetail, productivity, studies, studyDetail]) {
    assert.match(source, /workspaceMutationError/);
  }
  assert.doesNotMatch(productivity, /toast\.error\(error\.message\)/);
  assert.doesNotMatch(studyDetail, /onError: \(e: Error\) => toast\.error\(e\.message\)/);
  assert.match(journeysService, /FREE_CREATION_LIMIT_REACHED/);
  assert.match(journeysService, /Seu plano Free permite uma Jornada ativa/);
});

test("E84 plan matrix matches actual Assistant and attachment quotas", () => {
  assert.match(assistantQuota, /then 100 else 10/);
  assert.match(assistantQuota, /then 20 else 2/);
  for (const source of [webPremium, mobilePremium]) {
    assert.ok(source.includes("Assistant — 10"));
    assert.ok(source.includes("Assistant — 100"));
    assert.ok(source.includes("2 image/file analyses per day"));
    assert.ok(source.includes("20 image/file analyses per day"));
  }
});

test("E84 plan matrix tells the truth about workspace caps and Agents", () => {
  for (const source of [webPremium, mobilePremium]) {
    assert.ok(source.includes("Up to 3 active projects"));
    assert.ok(source.includes("Up to 30 open tasks"));
    assert.ok(source.includes("Up to 3 active study subjects"));
    assert.ok(source.includes("1 active Journey"));
    assert.ok(source.includes("Agents: creation, execution and scheduling"));
  }
  assert.match(agentPremium, /public\.has_premium\(new\.user_id\)/);
  assert.match(agentPremium, /premium_required/);
});

test("E84 language provider hydrates deterministically before reading browser state", () => {
  assert.match(languageProvider, /useState<LanguagePreference>\("system"\)/);
  assert.match(languageProvider, /useState<readonly string\[]>\(\["en"\]\)/);
  assert.match(languageProvider, /window\.localStorage\.getItem\(LANGUAGE_STORAGE_KEY\)/);
  assert.match(languageProvider, /navigator\.languages/);
  assert.doesNotMatch(languageProvider, /useState<LanguagePreference>\(initialPreference\)/);
});

test("E84 telemetry ignores only explicit browser-extension fingerprints", () => {
  assert.match(runtimeErrors, /__firefox__/);
  assert.match(runtimeErrors, /moz-extension:\/\//);
  assert.match(runtimeErrors, /chrome-extension:\/\//);
  assert.match(runtimeErrors, /safari-web-extension:\/\//);
  assert.match(runtimeErrors, /isKnownExternalBrowserNoise/);
  assert.doesNotMatch(runtimeErrors, /message === "Script error\."/);
  assert.doesNotMatch(runtimeErrors, /includes\("script error"\)/i);
});
