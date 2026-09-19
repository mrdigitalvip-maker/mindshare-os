import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source=(path:string)=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),"utf8");
const model=source("../lib/creator.ts");
const service=source("../services/creator-service.ts");
const analytics=source("../app/(app)/creator/analytics.tsx");
const intelligence=source("../../supabase/functions/_shared/creator-intelligence.ts");
const callback=source("../../supabase/functions/creator-oauth-callback/index.ts");

describe("E63/E64 YouTube OAuth reliability source parity",()=>{
  test("shared OAuth accepts canonical KIVRYN redirect and handles consent denial",()=>{
    expect(intelligence).toContain("https://kivryn.co");
    expect(intelligence).toContain('target.pathname !== "/creator"');
    expect(callback).toContain('oauthError === "access_denied"');
    expect(callback).toContain("creator_provider");
  });

  test("Android connection model carries scope and safe diagnostics",()=>{
    expect(model).toContain("grantedScopes: string[]");
    expect(model).toContain("safeErrorCode?: string");
    expect(service).toContain("safe_error_code,granted_scopes,granted_metrics");
  });

  test("Android shows truthful YouTube state and can sync an existing connection",()=>{
    expect(analytics).toContain("Permission required");
    expect(analytics).toContain("Sync pending");
    expect(analytics).toContain("syncCreatorAnalytics");
    expect(analytics).toContain("Update YouTube permissions in Web Creator before syncing.");
  });

  test("Android does not invent a native OAuth connection flow in this edition",()=>{
    expect(analytics).not.toContain("WebBrowser.openAuthSessionAsync");
    expect(analytics).not.toContain("Linking.openURL");
  });
});
