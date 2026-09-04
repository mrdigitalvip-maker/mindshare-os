import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  CREATOR_PROVIDER_CAPABILITIES,
  creatorConfidence,
  presentCreatorMetrics,
} from "../lib/creator";
const read = (path: string) =>
  readFileSync(path.startsWith("mobile/") ? path.slice(7) : `../${path}`, "utf8");
describe("NXR-037D Creator Intelligence", () => {
  const migration = read("supabase/migrations/202609040005_creator_intelligence.sql"),
    oauthStart = read("supabase/functions/creator-oauth-start/index.ts"),
    callback = read("supabase/functions/creator-oauth-callback/index.ts"),
    sync = read("supabase/functions/creator-analytics-sync/index.ts"),
    service = read("mobile/services/creator-service.ts"),
    ui = read("mobile/app/(app)/creator/analytics.tsx"),
    map = read("mobile/app/(app)/creator/map.tsx");
  test("connection is connected only after state, exchange, identity and persistence", () => {
    expect(oauthStart).toContain('status: "authorizing"');
    expect(oauthStart).not.toContain('status: "connected"');
    expect(callback).toContain("tokenResponse.ok");
    expect(callback).toContain("identityResponse.ok");
    expect(callback).toContain('status: "connected"');
  });
  test("provider credentials never enter mobile and clients cannot select them", () => {
    expect(service).not.toMatch(/access_token|refresh_token|provider_credentials/);
    expect(ui).not.toMatch(/access_token|refresh_token/);
    expect(migration).not.toMatch(/policy creator_provider_credentials/);
  });
  test("unsupported metrics stay absent while authoritative zero survives", () => {
    expect(CREATOR_PROVIDER_CAPABILITIES.youtube.metrics).not.toContain("retention_ratio");
    expect(CREATOR_PROVIDER_CAPABILITIES.tiktok.metrics).not.toContain("watch_time_ms");
    expect(
      presentCreatorMetrics({ platform: "youtube", capturedAt: "x", metrics: { views: 0 } }),
    ).toEqual([["views", 0]]);
    expect(presentCreatorMetrics({ platform: "youtube", capturedAt: "x", metrics: {} })).toEqual(
      [],
    );
  });
  test("country and charts only use persisted real observations", () => {
    expect(map).toContain("x.country && typeof x.metrics.views");
    expect(map).not.toMatch(/Math\.random|fake|mock/i);
    expect(ui).toContain("realObservationsOnly");
    expect(ui).not.toMatch(/Math\.random|interpolat/i);
  });
  test("posting-time insight is historical and insufficient samples make no claim", () => {
    expect(read("mobile/i18n/index.ts")).toContain('"Historical performance by posting time"');
    expect(map).toContain("postingRows.length >= 5");
    expect(map).toContain('t("creator.notEnoughData")');
  });
  test("confidence is deterministic", () => {
    const input = { sampleSize: 15, ageDays: 10, coefficientOfVariation: 0.3, completeness: 0.8 };
    expect(creatorConfidence(input)).toBe(creatorConfidence(input));
    expect(creatorConfidence({ ...input, sampleSize: 4 })).toBe("insufficient");
  });
  test("benchmarks require attribution and stay unseeded/distinct", () => {
    expect(migration).toContain("source_url");
    expect(migration).toContain("methodology");
    expect(migration).not.toMatch(/insert into public\.creator_benchmarks/i);
    expect(map).toContain('t("creator.globalBenchmark")');
    expect(map).toContain('t("creator.yourPerformance")');
  });
  test("disconnect disables future sync and deletion cascades owner data", () => {
    expect(sync).toContain('status: "revoked"');
    expect(sync).toContain("creator_provider_credentials");
    expect(sync).toContain('input.action === "delete"');
    expect(migration).toContain("on delete cascade");
  });
  test("RLS isolates owners and only backend writes analytics", () => {
    expect(migration).toContain("auth.uid()=user_id");
    expect(migration).not.toMatch(/analytics_(content|snapshots).*for (insert|update|all)/i);
  });
  test("Creator Intelligence UI is bilingual", () => {
    const i18n = read("mobile/i18n/index.ts");
    expect(i18n).toContain('"creator.connectedAccounts": "Contas conectadas"');
    expect(i18n).toContain('"creator.connectedAccounts": "Connected Accounts"');
  });
  test("OAuth security is bounded, allowlisted, PKCE and server exchanged", () => {
    expect(oauthStart).toContain("allowedRedirect");
    expect(oauthStart).toContain('code_challenge_method: "S256"');
    expect(callback).toContain("state.length > 512");
    expect(callback).toContain("client_secret");
  });
  test("billing and NXR-037C contracts remain intact", () => {
    expect(read("mobile/package.json")).not.toContain("react-native-iap");
    expect(read("supabase/migrations/202609040004_creator_video_engine.sql")).toContain(
      "creator_claim_job",
    );
  });
});
