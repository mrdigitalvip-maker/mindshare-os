import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`, import.meta.url),"utf8");

const intelligence=read("supabase/functions/_shared/creator-intelligence.ts");
const start=read("supabase/functions/creator-oauth-start/index.ts");
const callback=read("supabase/functions/creator-oauth-callback/index.ts");
const creator=read("src/routes/_shell.creator.tsx");

test("E63 accepts only canonical/explicit Creator OAuth return paths",()=>{
  assert.match(intelligence,/https:\/\/kivryn\.co/);
  assert.match(intelligence,/https:\/\/www\.kivryn\.co/);
  assert.match(intelligence,/target\.pathname !== "\/creator" && target\.pathname !== "\/settings"/);
  assert.match(intelligence,/CREATOR_OAUTH_REDIRECT_ALLOWLIST/);
  assert.doesNotMatch(intelligence,/return true;\s*}\s*catch/s);
});

test("E63 OAuth start remains authenticated and PKCE-backed",()=>{
  assert.match(start,/auth\.getUser\(\)/);
  assert.match(start,/code_challenge_method: "S256"/);
  assert.match(start,/encryptServerSecret\(verifier\)/);
  assert.match(start,/allowedRedirect\(redirectUri\)/);
  assert.match(start,/providerClientId\(provider\)/);
});

test("E63 safely handles Google consent denial and returns provider state",()=>{
  assert.match(callback,/oauthError = requestUrl\.searchParams\.get\("error"\)/);
  assert.match(callback,/oauthError === "access_denied" \? "consent_denied"/);
  assert.match(callback,/creator_provider/);
  assert.match(callback,/authorization_code_missing/);
  assert.match(callback,/cache-control": "no-store"/);
});

test("E64 runs a controlled first sync after a successful callback",()=>{
  assert.match(creator,/creator_connection/);
  assert.match(creator,/creator_provider/);
  assert.match(creator,/syncCreatorProviderAnalytics\(\)/);
  assert.match(creator,/creator_first_sync_failed/);
  assert.match(creator,/A conexão foi salva, mas a primeira sincronização não concluiu/);
  assert.match(creator,/window\.history\.replaceState/);
});

test("E64 distinguishes missing YouTube permissions from healthy connection",()=>{
  assert.match(creator,/YOUTUBE_REQUIRED_SCOPES/);
  assert.match(creator,/needs_permission/);
  assert.match(creator,/sync_pending/);
  assert.match(creator,/Revisar permissões/);
  assert.match(creator,/\["completed", "available", "ready", "connected"\]/);
});
