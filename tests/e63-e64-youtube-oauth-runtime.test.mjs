import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`, import.meta.url),"utf8");

const migration=read("supabase/migrations/202609180039_e64_youtube_connection_state.sql");
const intelligence=read("supabase/functions/_shared/creator-intelligence.ts");
const oauthStart=read("supabase/functions/creator-oauth-start/index.ts");
const oauthCallback=read("supabase/functions/creator-oauth-callback/index.ts");
const sync=read("supabase/functions/creator-analytics-sync/index.ts");
const service=read("src/services/creator-service.ts");
const route=read("src/routes/_shell.creator.tsx");

test("E63 accepts the canonical KIVRYN OAuth return without depending on APP_URL",()=>{
  assert.match(intelligence,/CANONICAL_KIVRYN_ORIGIN = "https:\/\/kivryn\.co"/);
  assert.match(intelligence,/allowedOrigins\.has\(target\.origin\)/);
  assert.match(intelligence,/target\.pathname === "\/creator"/);
  assert.match(intelligence,/target\.pathname === "\/settings"/);
  assert.match(oauthStart,/callback = `\$\{url\}\/functions\/v1\/creator-oauth-callback`/);
  assert.match(oauthStart,/code_challenge_method: "S256"/);
});

test("E63 callback returns provider denial safely to KIVRYN instead of stranding the user",()=>{
  assert.match(oauthCallback,/providerError = requestUrl\.searchParams\.get\("error"\)/);
  assert.match(oauthCallback,/providerError === "access_denied" \? "access_denied" : "oauth_callback_failed"/);
  assert.match(oauthCallback,/creator_provider/);
  assert.match(oauthCallback,/cache-control",\s*"no-store"/);
});

test("E64 persists real YouTube channel identity and honest permission state",()=>{
  assert.match(migration,/needs_permission/);
  assert.match(migration,/provider_avatar_url/);
  assert.match(oauthCallback,/provider_avatar_url: avatarUrl/);
  assert.match(oauthCallback,/provider_account_type: accountType/);
  assert.match(oauthCallback,/account\?\.snippet\?\.thumbnails/);
  assert.match(sync,/status: "needs_permission"/);
  assert.match(sync,/safe_error_code: "insufficient_scope"/);
});

test("E64 first sync is provider-scoped and Web-triggered only after a successful YouTube callback",()=>{
  assert.match(sync,/input\.provider === "youtube" \|\| input\.provider === "tiktok"/);
  assert.match(sync,/connectionQuery = connectionQuery\.eq\("platform", input\.provider\)/);
  assert.match(service,/syncCreatorProviderAnalytics\([\s\S]*provider\?: CreatorProvider/);
  assert.match(route,/connectionProvider === "youtube"/);
  assert.match(route,/syncCreatorProviderAnalytics\(undefined, "youtube"\)/);
  assert.match(route,/Canal do YouTube conectado\. Fazendo a primeira sincronização/);
});

test("E63/E64 Web shows truthful states and safe start errors",()=>{
  assert.match(service,/CreatorProviderConnectionError/);
  assert.match(service,/redirect_not_allowed/);
  assert.match(service,/provider_not_configured/);
  assert.match(route,/needs_permission: "precisa de permissão"/);
  assert.match(route,/Atualizar permissões do YouTube/);
  assert.match(route,/provider_avatar_url/);
  assert.match(route,/Última sincronização/);
});

test("YouTube remains official-API-only with read and analytics scopes",()=>{
  assert.match(intelligence,/youtube\.readonly/);
  assert.match(intelligence,/yt-analytics\.readonly/);
  assert.doesNotMatch(sync,/yt-dlp|youtube-dl/i);
  assert.doesNotMatch(oauthStart,/youtube\.upload/);
});
