import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`, import.meta.url),"utf8");

const migration=read("supabase/migrations/202609180037_e59_google_workspace_oauth.sql");
const registry=read("supabase/functions/_shared/kivryn-integration-registry.ts");
const intelligence=read("supabase/functions/_shared/creator-intelligence.ts");
const oauthStart=read("supabase/functions/creator-oauth-start/index.ts");
const oauthCallback=read("supabase/functions/creator-oauth-callback/index.ts");
const status=read("supabase/functions/integration-status/index.ts");
const workspaceRead=read("supabase/functions/google-workspace-read/index.ts");
const settings=read("src/routes/_shell.settings.tsx");
const service=read("src/services/integration-status-service.ts");

test("E59 extends the existing encrypted connection vault to Google Workspace",()=>{
  for(const provider of ["gmail","google_calendar","google_drive"]){
    assert.match(migration,new RegExp("'"+provider+"'::text"));
  }
  assert.match(migration,/creator_platform_connections_platform_check/);
  assert.match(migration,/creator_oauth_states_provider_check/);
  assert.doesNotMatch(migration,/create table/i);
});

test("E59 guarantees real OAuth read scopes; later editions may add approval-gated writes",()=>{
  for(const provider of ["gmail","google_calendar","google_drive"]){
    assert.match(registry,new RegExp(provider+"[\\s\\S]*implemented: true"));
    assert.match(registry,new RegExp(provider+"[\\s\\S]*authMode: \"oauth\""));
  }
  assert.match(registry,/gmail\.readonly/);
  assert.match(registry,/calendar\.readonly/);
  assert.match(registry,/drive\.readonly/);
  assert.match(registry,/gmail\.send/);
  assert.match(registry,/calendar\.events/);
  assert.match(registry,/drive\.file/);

  assert.match(intelligence,/gmail:[\s\S]*mail\.read/);
  assert.match(intelligence,/google_calendar:[\s\S]*calendar\.read/);
  assert.match(intelligence,/google_drive:[\s\S]*files\.read/);
});

test("E59 reuses PKCE/state and encrypted credentials for Google Workspace",()=>{
  assert.match(oauthStart,/isGoogleOAuthProvider\(provider\)/);
  assert.match(oauthStart,/code_challenge_method: "S256"/);
  assert.match(oauthStart,/encryptServerSecret\(verifier\)/);
  assert.match(oauthCallback,/providerClientId\(provider\)/);
  assert.match(oauthCallback,/providerClientSecret\(provider\)/);
  assert.match(oauthCallback,/openidconnect\.googleapis\.com|identityUrl/);
  assert.match(oauthCallback,/encryptServerSecret\(accessToken\)/);
  assert.match(oauthCallback,/refresh_token_ciphertext/);
});

test("E59 status is fail-closed when Google runtime credentials are absent",()=>{
  assert.match(status,/GOOGLE_WORKSPACE_CLIENT_ID/);
  assert.match(status,/GOOGLE_WORKSPACE_CLIENT_SECRET/);
  assert.match(status,/runtimeConfigured: configured/);
  assert.match(status,/canConnect: definition\.implemented && definition\.authMode === "oauth" && configured/);
});

test("E60 performs owner-authenticated read-only Workspace access",()=>{
  assert.match(workspaceRead,/auth\.getUser\(\)/);
  assert.match(workspaceRead,/canUseKivrynIntegrationCapability/);
  assert.match(workspaceRead,/gmail\.googleapis\.com\/gmail\/v1\/users\/me\/messages/);
  assert.match(workspaceRead,/googleapis\.com\/calendar\/v3\/calendars\/primary\/events/);
  assert.match(workspaceRead,/googleapis\.com\/drive\/v3\/files/);
  assert.match(workspaceRead,/oauth2\.googleapis\.com\/token/);
  assert.doesNotMatch(workspaceRead,/\/messages\/send/);
  assert.doesNotMatch(workspaceRead,/calendar\.events/);
  assert.doesNotMatch(workspaceRead,/drive\.file/);
});

test("E59/E60 Web Settings connects and reads Workspace without routing it through Creator",()=>{
  assert.match(service,/startIntegrationConnection/);
  assert.match(service,/readGoogleWorkspace/);
  assert.match(settings,/connectWorkspace/);
  assert.match(settings,/readWorkspace/);
  assert.match(settings,/Disponível para conectar/);
  assert.match(settings,/Ler agora/);
});
