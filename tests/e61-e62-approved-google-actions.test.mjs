import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`, import.meta.url),"utf8");

const migration=read("supabase/migrations/202609180038_e61_external_action_authority.sql");
const actionRegistry=read("supabase/functions/_shared/kivryn-action-registry.ts");
const capabilities=read("supabase/functions/_shared/kivryn-agent-capabilities.ts");
const skills=read("supabase/functions/_shared/kivryn-agent-skills.ts");
const runtime=read("supabase/functions/_shared/agent-execution.ts");
const planner=read("supabase/functions/_shared/kivryn-openai-agentic.ts");
const approval=read("supabase/functions/agent-action-review/index.ts");
const executor=read("supabase/functions/_shared/kivryn-integration-action-execution.ts");
const access=read("supabase/functions/_shared/google-workspace-access.ts");
const intelligence=read("supabase/functions/_shared/creator-intelligence.ts");
const settings=read("src/routes/_shell.settings.tsx");
const webSkills=read("src/services/agent-skill-service.ts");
const webRuntime=read("src/services/agent-runtime-service.ts");

test("E61 extends Agent authority only through explicit integrations capability",()=>{
  assert.match(actionRegistry,/KivrynActionDomain = "tasks" \| "projects" \| "studies" \| "integrations"/);
  assert.match(capabilities,/integrations: \["integrations"\]/);
  assert.match(runtime,/CAPABILITIES = new Set\(\[[^\]]*"integrations"/);
  assert.match(skills,/capability: "integrations"/);
  assert.match(webSkills,/capability: "integrations"/);
  assert.match(webRuntime,/domain: "tasks" \| "projects" \| "studies" \| "integrations"/);
  assert.doesNotMatch(capabilities,/planning: \[[^\]]*integrations/);
  assert.doesNotMatch(capabilities,/productivity: \[[^\]]*integrations/);
});

test("E61 registers Google mutations as approval-required integration actions",()=>{
  for(const action of ["send_email","create_calendar_event","create_drive_text_file"]){
    assert.match(actionRegistry,new RegExp(action+"[\\s\\S]{0,600}domain: \"integrations\""));
    assert.match(actionRegistry,new RegExp(action+"[\\s\\S]{0,600}requiresApproval: true"));
  }
  assert.match(planner,/to: \{ type: \["string", "null"\]/);
  assert.match(planner,/summary: \{ type: \["string", "null"\]/);
  assert.match(planner,/content: \{ type: \["string", "null"\]/);
});

test("E61 audit and idempotency ledgers explicitly support external receipts",()=>{
  assert.match(migration,/domain in \('tasks','projects','studies','integrations'\)/);
  assert.match(migration,/status in \('approval_required','approved','applied','rejected','failed','uncertain'\)/);
  assert.match(migration,/provider text/);
  assert.match(migration,/external_resource_ref text/);
  assert.match(migration,/status in \('applying','applied','failed','uncertain'\)/);
});

test("E62 executes external mutations only from the existing approval endpoint",()=>{
  assert.match(approval,/executeKivrynIntegrationAction/);
  assert.match(approval,/step\.domain === "integrations"/);
  assert.match(approval,/prepared\.commands/);
  assert.match(approval,/approvedStepIds/);
  assert.match(approval,/planFingerprint/);
  assert.doesNotMatch(settings,/sendEmail\(|createCalendarEvent\(|createDriveTextFile\(/);
});

test("E62 enforces provider scope before claim and stores an execution receipt",()=>{
  assert.match(executor,/resolveGoogleWorkspaceAccess/);
  assert.match(executor,/capability: authority\.capability/);
  assert.match(executor,/nexora_action_runs/);
  assert.match(executor,/status: "applying"/);
  assert.match(executor,/external_resource_ref/);
  assert.match(executor,/integration_action_uncertain/);
  assert.match(executor,/existing\.status === "applying" \|\| existing\.status === "uncertain"/);
  assert.match(access,/canUseKivrynIntegrationCapability/);
});

test("E62 has real Google write adapters but no silent retry loop",()=>{
  assert.match(executor,/gmail\.googleapis\.com\/gmail\/v1\/users\/me\/messages\/send/);
  assert.match(executor,/googleapis\.com\/calendar\/v3\/calendars\/primary\/events/);
  assert.match(executor,/googleapis\.com\/upload\/drive\/v3\/files/);
  assert.doesNotMatch(executor,/for \(let attempt|while \(|retryDelay/);
  assert.match(executor,/AbortController/);
  assert.match(executor,/20_000/);
  assert.match(executor,/response\.status === 429 \|\| response\.status >= 500/);
  assert.match(executor,/status: uncertain \? "uncertain" : "failed"/);
});

test("E62 requests Google write scopes while keeping mutation approval in KIVRYN",()=>{
  assert.match(intelligence,/capabilityScopes\["mail\.send"\]/);
  assert.match(intelligence,/capabilityScopes\["calendar\.write"\]/);
  assert.match(intelligence,/capabilityScopes\["files\.write"\]/);
  assert.match(settings,/Atualizar permissões/);
  assert.match(actionRegistry,/send_email[\s\S]*requiresApproval: true/);
});
