import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source=(path:string)=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),"utf8");
const registry=source("../../supabase/functions/_shared/kivryn-integration-registry.ts");
const intelligence=source("../../supabase/functions/_shared/creator-intelligence.ts");
const workspaceRead=source("../../supabase/functions/google-workspace-read/index.ts");
const service=source("../services/integration-status-service.ts");
const settings=source("../app/(app)/settings.tsx");

describe("E59/E60 Google Workspace source parity",()=>{
  test("shared registry exposes Gmail, Calendar and Drive as real OAuth providers",()=>{
    for(const provider of ["gmail","google_calendar","google_drive"]){
      expect(registry).toContain(provider);
    }
    expect(registry).toContain('"mail.read"');
    expect(registry).toContain('"calendar.read"');
    expect(registry).toContain('"files.read"');
  });

  test("OAuth provider request remains read-only in this edition",()=>{
    expect(intelligence).toContain('KIVRYN_INTEGRATION_PROVIDERS.gmail.capabilityScopes["mail.read"]');
    expect(intelligence).toContain('KIVRYN_INTEGRATION_PROVIDERS.google_calendar.capabilityScopes["calendar.read"]');
    expect(intelligence).toContain('KIVRYN_INTEGRATION_PROVIDERS.google_drive.capabilityScopes["files.read"]');
  });

  test("Android can read an already-connected Workspace account",()=>{
    expect(service).toContain("readGoogleWorkspace");
    expect(service).toContain('"google-workspace-read"');
    expect(settings).toContain("readWorkspace");
    expect(settings).toContain("workspaceRead");
    expect(settings).toContain("Ready to connect");
  });

  test("Workspace runtime remains authenticated and server-side",()=>{
    expect(workspaceRead).toContain("auth.getUser()");
    expect(workspaceRead).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(workspaceRead).toContain("creator_provider_credentials");
    expect(workspaceRead).toContain("canUseKivrynIntegrationCapability");
  });
});
