import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source=(path:string)=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),"utf8");
const creatorDomain=source("../lib/creator.ts");
const creatorService=source("../services/creator-service.ts");
const analytics=source("../app/(app)/creator/analytics.tsx");
const settings=source("../app/(app)/settings.tsx");
const integrationService=source("../services/integration-status-service.ts");

describe("E63/E64 YouTube connection source parity",()=>{
  test("Android connection model carries provider health without tokens",()=>{
    expect(creatorDomain).toContain("safeErrorCode?: string");
    expect(creatorDomain).toContain("grantedScopes: string[]");
    expect(creatorDomain).toContain("avatarUrl?: string");
    expect(creatorService).toContain("provider_avatar_url");
    expect(creatorService).toContain("safe_error_code");
    expect(creatorService).not.toContain("access_token_ciphertext");
    expect(creatorService).not.toContain("refresh_token_ciphertext");
  });

  test("Android can initiate real YouTube OAuth in the browser without inventing a native deep-link",()=>{
    expect(analytics).toContain('startCreatorOAuth("youtube", "https://kivryn.co/creator")');
    expect(analytics).toContain("Linking.openURL");
    expect(analytics).not.toContain("kivryn://");
    expect(analytics).toContain("Atualizar estado");
  });

  test("Android exposes sync, permission refresh and disconnect for YouTube",()=>{
    expect(creatorService).toContain("syncCreatorAnalytics(connectionId?: string)");
    expect(analytics).toContain("syncYouTube");
    expect(analytics).toContain("Atualizar permissões");
    expect(analytics).toContain("disconnectYouTube");
  });

  test("Settings uses backend-derived connectionState rather than raw connected status",()=>{
    expect(integrationService).toContain("connectionState:");
    expect(integrationService).toContain("safeErrorCode:");
    expect(settings).toContain('provider.connectionState === "connected"');
    expect(settings).toContain("Needs permission");
  });
});
