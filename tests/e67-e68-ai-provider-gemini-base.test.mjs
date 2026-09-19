import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const read=(path)=>readFileSync(new URL(`../${path}`, import.meta.url),"utf8");
const migration=read("supabase/migrations/202609180042_e67_ai_provider_usage_guard.sql");
const registry=read("supabase/functions/_shared/kivryn-ai-provider-registry.ts");
const router=read("supabase/functions/_shared/kivryn-ai-provider-router.ts");
const gemini=read("supabase/functions/_shared/kivryn-gemini.ts");
const statusEdge=read("supabase/functions/ai-provider-status/index.ts");
const openaiAgentic=read("supabase/functions/_shared/kivryn-openai-agentic.ts");

function walk(dir){
  const out=[];
  for(const name of readdirSync(dir)){
    const full=join(dir,name);
    const stat=statSync(full);
    if(stat.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

test("E67 declares OpenAI and Gemini behind KIVRYN authority",()=>{
  assert.match(registry,/openai:/);
  assert.match(registry,/gemini:/);
  assert.match(registry,/authority: "none"/g);
  assert.match(registry,/credentialBoundary: "server_only"/g);
  assert.match(registry,/live_voice/);
  assert.match(registry,/video_understanding/);
});

test("E67 keeps OpenAI primary and Gemini Live disabled until later Editions",()=>{
  assert.match(router,/text: "openai"/);
  assert.match(router,/reasoning: "openai"/);
  assert.match(router,/tool_calling: "openai"/);
  assert.match(registry,/enabledCapabilities: \["text", "reasoning"\]/);
  assert.match(statusEdge,/openaiRemainsPrimary: true/);
  assert.match(statusEdge,/geminiLiveEnabled: false/);
  assert.match(openaiAgentic,/RESPONSES_URL = "https:\/\/api\.openai\.com\/v1\/responses"/);
});

test("E67 billing guard cannot activate paid mode with one client-controlled switch",()=>{
  assert.match(registry,/GEMINI_MODE/);
  assert.match(registry,/GEMINI_PAID_AUTHORIZED/);
  assert.match(registry,/requested === "paid" && paidAuthorized \? "paid" : "free"/);
  assert.doesNotMatch(statusEdge,/GEMINI_MODE\s*=/);
});

test("E67 provider usage ledger is server-owned and stores no prompt or transcript",()=>{
  assert.match(migration,/create table if not exists public\.ai_provider_usage_claims/);
  assert.match(migration,/revoke all privileges on table public\.ai_provider_usage_claims from anon, authenticated/);
  assert.match(migration,/grant select, insert, update, delete on table public\.ai_provider_usage_claims to service_role/);
  const executable=migration.replace(/^--.*$/gm,"").replace(/comment on table[\s\S]*?;\s*/gi,"");
  assert.doesNotMatch(executable,/\b(prompt|transcript|audio|content)\b\s+text/i);
});

test("E68 Gemini adapter is bounded, quota-aware and server-authenticated",()=>{
  assert.match(gemini,/generativelanguage\.googleapis\.com\/v1beta/);
  assert.match(gemini,/"x-goog-api-key": credential/);
  assert.match(gemini,/AbortController/);
  assert.match(gemini,/GEMINI_FREE_DAILY_REQUEST_LIMIT/);
  assert.match(gemini,/GEMINI_FREE_RPM_LIMIT/);
  assert.match(gemini,/provider_quota_limited/);
  assert.doesNotMatch(gemini,/while\s*\(|for\s*\(let attempt|retryDelay/);
});

test("E68 diagnostic probe is authenticated and beta-internal only",()=>{
  assert.match(statusEdge,/auth\.getUser\(\)/);
  assert.match(statusEdge,/internal_access_overrides/);
  assert.match(statusEdge,/beta_access_required/);
  assert.match(statusEdge,/runKivrynGeminiText/);
  assert.match(statusEdge,/clientProviderSelection: false/);
});

test("Gemini long-lived credentials never appear in Web or Android bundles",()=>{
  for(const root of ["src","mobile"]){
    for(const file of walk(root)){
      if(!/\.(ts|tsx|js|jsx|json)$/.test(file)) continue;
      const value=readFileSync(file,"utf8");
      assert.doesNotMatch(value,/GEMINI_(?:API|AUTH)_KEY/, `Gemini secret reference leaked into ${file}`);
    }
  }
});
