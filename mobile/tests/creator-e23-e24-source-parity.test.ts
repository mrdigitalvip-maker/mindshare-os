import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const read = (path: string) =>
  readFileSync(path.startsWith("mobile/") ? path.slice(7) : `../${path}`, "utf8");

describe("E23 + E24 Android source parity", () => {
  const mobileService = read("mobile/services/creator-service.ts");
  const mobileProject = read("mobile/app/(app)/creator/[projectId].tsx");
  const mobileAnalytics = read("mobile/app/(app)/creator/analytics.tsx");
  const webService = read("src/services/creator-service.ts");
  const webCreator = read("src/routes/_shell.creator.tsx");
  const worker = read("services/creator-worker/src/main.ts");
  const workerDomain = read("services/creator-worker/src/domain.ts");
  const oauthCallback = read("supabase/functions/creator-oauth-callback/index.ts");
  const analyticsSync = read("supabase/functions/creator-analytics-sync/index.ts");

  test("E23 web and Android share the canonical clipping RPCs and worker", () => {
    for (const rpc of ["cancel_creator_job", "enqueue_creator_rerender"]) {
      expect(webService).toContain(rpc);
      expect(mobileService).toContain(rpc);
    }
    expect(webCreator).toContain("Clipping workflow");
    expect(mobileProject).toContain("getLatestCreatorJob");
    expect(mobileProject).toContain("requestClipRerender");
    expect(worker).toContain("selectQualityCandidates(scored");
    expect(workerDomain).toContain("if (out.length) return out");\n    expect(workerDomain).toContain("selectQualityCandidates");
    expect(workerDomain).toContain("const maxWindow = Math.min(60_000");
  });

  test("E23 outputs remain private and signed on both clients", () => {
    expect(webService).toContain('from("creator-outputs").createSignedUrl');
    expect(mobileService).toContain('from("creator-outputs")');
    expect(mobileService).toContain("createSignedUrl");
    expect(mobileProject).toContain("requestCreatorExport");
  });

  test("E24 mobile and web use the same provider functions", () => {
    for (const fn of ["creator-oauth-start", "creator-analytics-sync"]) {
      expect(webService).toContain(fn);
      expect(mobileService).toContain(fn);
    }
    expect(webService).toContain("disconnectCreatorProvider");
    expect(mobileService).toContain("disconnectCreatorConnection");
    expect(mobileService).toContain("listCreatorConnections");
    expect(mobileService).toContain("listCreatorAnalytics");
    expect(mobileAnalytics).toContain("connectedCount");
  });

  test("E24 provider evidence is server-persisted and never fabricated in Android", () => {
    expect(analyticsSync).toContain("creator_analytics_content");
    expect(analyticsSync).toContain("creator_analytics_snapshots");
    expect(analyticsSync).toContain("provider_payload_fingerprint");
    expect(analyticsSync).toContain("granted_metric_names");
    expect(analyticsSync).not.toMatch(
      /(?:view_count|like_count|comment_count|share_count|viewCount|likeCount|commentCount)\s*\?\?\s*0/,
    );
    expect(mobileAnalytics).not.toMatch(/sampleData|mockChart|fakeAnalytics/i);
  });

  test("OAuth refresh and state security stay server-only", () => {
    expect(analyticsSync).toContain('grant_type: "refresh_token"');
    expect(analyticsSync).toContain("encryptServerSecret(accessToken)");
    expect(oauthCallback).toContain('.is("consumed_at", null)');
    expect(oauthCallback).toContain('.select("state_hash")');
    expect(oauthCallback).toContain('existingCredential?.refresh_token_ciphertext ?? null');
    expect(mobileService).not.toMatch(/access_token|refresh_token|provider_credentials/);
    expect(mobileAnalytics).not.toMatch(/access_token|refresh_token|client_secret/i);
  });

  test("shared Assistant context remains type-safe for Android source validation", () => {
    const assistantContext = read("supabase/functions/_shared/assistant-context.ts");
    expect(assistantContext).toContain("documents: []");
  });

  test("E23 + E24 do not add an Android billing/native release dependency", () => {
    const pkg = read("mobile/package.json");
    expect(pkg).not.toMatch(/react-native-iap|nitro-modules/i);
    const appConfig = read("mobile/app.json");
    expect(appConfig).toContain('"package": "kivryn.app"');
    expect(appConfig).toContain('"scheme": "kivryn"');
  });
});
