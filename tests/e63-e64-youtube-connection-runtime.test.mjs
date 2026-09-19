import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

const intelligence=read("supabase/functions/_shared/creator-intelligence.ts");
const oauthStart=read("supabase/functions/creator-oauth-start/index.ts");
const oauthCallback=read("supabase/functions/creator-oauth-callback/index.ts");
const sync=read("supabase/functions/creator-analytics-sync/index.ts");
const status=read("supabase/functions/integration-status/index.ts");
const migration=read("supabase/migrations/202609180039_e64_youtube_connection_state.sql");
const service=read("src/services/creator-service.ts");
const creator=read("src/routes/_shell.creator.tsx");
const settings=read("src/routes/_shell.settings.tsx");

test("E63 accepts the canonical KIVRYN OAuth return independently of APP_URL",()=>{
  assert.match(intelligence,/https:\/\/kivryn\.co/);
  assert.match(intelligence,/pathname === "\/creator"/);
  assert.match(intelligence,/pathname === "\/settings"/);
  assert.match(oauthStart,/allowedRedirect\(redirectUri\)/);
  assert.match(oauthStart,/redirect_not_allowed/);
});

test("E63 redirects Google permission denial back to KIVRYN with a safe code",()=>{
  assert.match(oauthCallback,/providerError = requestUrl\.searchParams\.get\("error"\)/);
  assert.match(oauthCallback,/providerError === "access_denied" \? "permission_denied"/);
  assert.match(oauthCallback,/target\.searchParams\.set\("provider", provider\)/);
  assert.match(oauthCallback,/invalid_oauth_callback/);
});

test("E63 preserves safe structured OAuth errors in the Web service",()=>{
  assert.match(service,/class CreatorProviderConnectionError/);
  for(const code of [
    "redirect_not_allowed",
    "provider_not_configured",
    "oauth_state_failed",
    "permission_denied",
    "token_exchange_failed",
    "identity_failed",
  ]) assert.match(service,new RegExp(code));
  assert.match(creator,/creatorProviderConnectionErrorMessage/);
  assert.doesNotMatch(creator,/connectionError\.replaceAll\("_", " "\)/);
});

test("E64 persists only safe public provider presentation metadata",()=>{
  assert.match(migration,/provider_avatar_url text/);
  assert.match(migration,/\^https:\/\//);
  assert.match(oauthCallback,/provider_avatar_url: safeAvatarUrl/);
  assert.match(oauthCallback,/provider_account_type: provider === "youtube" \? "channel" : "account"/);
  assert.match(oauthCallback,/snippet\?\.thumbnails/);
});

test("E64 derives truthful connection health from scopes and provider state",()=>{
  assert.match(status,/safe_error_code,granted_scopes/);
  assert.match(status,/safeErrorCode === "insufficient_scope"/);
  assert.match(status,/"needs_permission"/);
  assert.match(status,/availableCapabilities/);
  assert.match(status,/avatarUrl: connection\?\.provider_avatar_url/);
  assert.match(sync,/status: "error",[\s\S]*safe_error_code: "insufficient_scope"/);
});

test("E64 Web Creator performs a first YouTube sync and renders truthful state",()=>{
  assert.match(creator,/provider === "youtube"[\s\S]*syncCreatorProviderAnalytics\(\)/);
  assert.match(creator,/creatorConnectionState/);
  assert.match(creator,/provider_avatar_url/);
  assert.match(creator,/Última sincronização/);
  assert.match(creator,/Atualizar permissões/);
  assert.match(settings,/provider\.connectionState === "connected"/);
  assert.match(settings,/Precisa de permissão/);
});
