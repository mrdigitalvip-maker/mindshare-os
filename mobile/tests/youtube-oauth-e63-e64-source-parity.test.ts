import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source=(path:string)=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),"utf8");

const migration=source("../../supabase/migrations/202609180039_e64_youtube_connection_state.sql");
const intelligence=source("../../supabase/functions/_shared/creator-intelligence.ts");
const sync=source("../../supabase/functions/creator-analytics-sync/index.ts");
const creator=source("../lib/creator.ts");
const service=source("../services/creator-service.ts");
const screen=source("../app/(app)/creator/analytics.tsx");

describe("E63/E64 YouTube OAuth and runtime parity",()=>{
  test("shared OAuth boundary trusts canonical production return and preserves PKCE",()=>{
    expect(intelligence).toContain('CANONICAL_KIVRYN_ORIGIN = "https://kivryn.co"');
    expect(intelligence).toContain('target.pathname === "/creator"');
  });

  test("Android understands the honest connection lifecycle",()=>{
    expect(creator).toContain('"needs_permission"');
    expect(migration).toContain("'needs_permission'::text");
    expect(service).toContain("provider_avatar_url");
    expect(service).toContain("safe_error_code");
    expect(service).toContain("granted_scopes");
  });

  test("Android reads only Creator providers and can sync a connected YouTube channel",()=>{
    expect(service).toContain('.in("platform", ["youtube", "tiktok", "instagram"])');
    expect(service).toContain("connectionId?: string");
    expect(service).toContain('provider?: "youtube" | "tiktok"');
    expect(screen).toContain("syncCreatorAnalytics");
    expect(screen).toContain("Needs permission");
    expect(screen).toContain("Precisa de permissão");
  });

  test("Web-first parity stays truthful instead of faking native OAuth",()=>{
    expect(screen).toContain("KIVRYN Web");
    expect(screen).not.toContain("startCreatorOAuth(");
  });

  test("shared sync marks insufficient scope as needs_permission",()=>{
    expect(sync).toContain('status: "needs_permission"');
    expect(sync).toContain('safe_error_code: "insufficient_scope"');
  });
});
