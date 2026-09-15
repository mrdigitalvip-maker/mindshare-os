import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const registryPath = new URL(
  "../supabase/functions/_shared/kivryn-agent-skills.ts",
  import.meta.url,
);
const executionPath = new URL(
  "../supabase/functions/_shared/agent-execution.ts",
  import.meta.url,
);
const migrationPath = new URL(
  "../supabase/migrations/20260915141000_agent_specialized_skills.sql",
  import.meta.url,
);
const webCatalogPath = new URL("../src/services/agent-skill-service.ts", import.meta.url);
const webAgentsPath = new URL("../src/routes/_shell.agents.tsx", import.meta.url);
const mobileCatalogPath = new URL("../mobile/services/agent-skill-service.ts", import.meta.url);
const mobileAgentServicePath = new URL(
  "../mobile/services/agent-schedule-service.ts",
  import.meta.url,
);
const mobileAgentsPath = new URL("../mobile/app/(app)/agents.tsx", import.meta.url);

test("Edition 13 defines five versioned KIVRYN-owned specialized skills", async () => {
  const source = await readFile(registryPath, "utf8");
  assert.match(source, /KIVRYN_SKILL_REGISTRY_VERSION = 1/);
  for (const id of [
    "writing.v1",
    "planning.v1",
    "summarization.v1",
    "study.v1",
    "productivity.v1",
  ]) {
    assert.match(source, new RegExp(id.replace(".", "\\.")));
  }
  assert.match(source, /resolveKivrynAgentSkills/);
  assert.match(source, /serializeKivrynAgentSkills/);
  assert.match(source, /resolveAgentActionDomains/);
});

test("Specialized skills stay bounded by context and existing Action Layer authority", async () => {
  const source = await readFile(registryPath, "utf8");
  assert.match(source, /contextScopes: \[\.\.\.BASE_CONTEXT, "tasks", "projects"\]/);
  assert.match(source, /contextScopes: \[\.\.\.BASE_CONTEXT, "studies", "passport"\]/);
  assert.match(source, /explicit KIVRYN action approval/);
  assert.doesNotMatch(source, /finance_transactions/);
  assert.doesNotMatch(source, /api_keys/);
  assert.doesNotMatch(source, /subscriptions/);
});

test("Agent execution persists and injects the exact specialized skill versions", async () => {
  const source = await readFile(executionPath, "utf8");
  assert.match(source, /resolveKivrynAgentSkills\(capabilities\)/);
  assert.match(source, /serializeKivrynAgentSkills\(skills\)/);
  assert.match(source, /skill_ids: skillIds/);
  assert.match(source, /skill_registry_version: KIVRYN_SKILL_REGISTRY_VERSION/);
  assert.match(source, /KIVRYN specialized skills/);
  assert.match(source, /they do not grant mutation approval/);
  assert.match(source, /Never invent a skill, connector, subagent, tool or authority/);
  assert.match(source, /skillIds,/);
});

test("Edition 13 migration constrains observed run skills to the versioned registry", async () => {
  const source = await readFile(migrationPath, "utf8");
  assert.match(source, /add column if not exists skill_ids text\[\] not null default/);
  assert.match(source, /add column if not exists skill_registry_version smallint not null default 1/);
  assert.match(source, /agent_runs_skill_ids_check/);
  assert.match(source, /skill_ids <@ array/);
  assert.match(source, /agent_runs_user_skills_created_idx/);
});

test("Web exposes the same specialized skill IDs and uses them in the Agent builder/cards", async () => {
  const [catalog, route] = await Promise.all([
    readFile(webCatalogPath, "utf8"),
    readFile(webAgentsPath, "utf8"),
  ]);
  assert.match(catalog, /WEB_AGENT_SKILLS/);
  assert.match(catalog, /resolveWebAgentSkills/);
  assert.match(route, /Skills especializadas/);
  assert.match(route, /resolveWebAgentSkills\(a\.capabilities\)/);
  assert.match(route, /skill\.name/);
  assert.match(route, /Autoridade para alterar o workspace continua separada/);
});

test("Android maps legacy capability IDs to the same specialized skill catalog and surfaces them", async () => {
  const [catalog, service, route] = await Promise.all([
    readFile(mobileCatalogPath, "utf8"),
    readFile(mobileAgentServicePath, "utf8"),
    readFile(mobileAgentsPath, "utf8"),
  ]);
  assert.match(catalog, /MOBILE_AGENT_SKILLS/);
  assert.match(catalog, /resolveMobileAgentSkills/);
  assert.match(service, /skills: MobileAgentSkill\[\]/);
  assert.match(service, /skills: resolveMobileAgentSkills\(capabilities\)/);
  assert.match(route, /agent\.skills\.length/);
  assert.match(route, /agent\.skills\.map/);
  assert.match(route, /qualquer ação real em Tasks, Projects ou Studies continua exigindo aprovação válida/);
});
