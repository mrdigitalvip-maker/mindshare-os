import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source=(path:string)=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),"utf8");

const actionRegistry=source("../../supabase/functions/_shared/kivryn-action-registry.ts");
const capabilities=source("../../supabase/functions/_shared/kivryn-agent-capabilities.ts");
const approval=source("../../supabase/functions/agent-action-review/index.ts");
const executor=source("../../supabase/functions/_shared/kivryn-integration-action-execution.ts");
const mobileSkills=source("../services/agent-skill-service.ts");
const mobileRuntime=source("../services/agent-runtime-service.ts");
const mobileHistory=source("../services/action-history-service.ts");
const mobileAgents=source("../app/(app)/agents.tsx");

describe("E61/E62 approved Google actions source parity",()=>{
  test("Android exposes integrations only as an explicit Agent capability",()=>{
    expect(capabilities).toContain('integrations: ["integrations"]');
    expect(mobileSkills).toContain('capability: "integrations"');
    expect(mobileRuntime).toContain('| "integrations"');
  });

  test("external Google actions remain registry-backed and approval-required",()=>{
    for(const action of ["send_email","create_calendar_event","create_drive_text_file"]){
      expect(actionRegistry).toContain(action);
    }
    expect(approval).toContain('step.domain === "integrations"');
    expect(approval).toContain("executeKivrynIntegrationAction");
  });

  test("Android review UI explicitly warns before external execution",()=>{
    expect(mobileAgents).toContain('step.domain === "integrations"');
    expect(mobileAgents).toContain("Ação externa:");
    expect(mobileAgents).toContain("Aprovar restantes");
  });

  test("Android history understands integrations and uncertain execution",()=>{
    expect(mobileHistory).toContain('| "integrations"');
    expect(mobileHistory).toContain('| "uncertain"');
    expect(mobileAgents).toContain("historyStatusUncertain");
  });

  test("executor is server-side and protects against ambiguous duplicate writes",()=>{
    expect(executor).toContain("resolveGoogleWorkspaceAccess");
    expect(executor).toContain('"uncertain"');
    expect(executor).toContain("integration_action_uncertain");
    expect(executor).toContain("externalResourceRef");
  });
});
