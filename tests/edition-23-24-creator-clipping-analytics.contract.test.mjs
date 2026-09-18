import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("E23 exposes the real clipping workflow instead of creating presentation-only clips", async () => {
  const [route, service, worker, workerDomain] = await Promise.all([
    read("src/routes/_shell.creator.tsx"),
    read("src/services/creator-service.ts"),
    read("services/creator-worker/src/main.ts"),
    read("services/creator-worker/src/domain.ts"),
  ]);

  assert.match(route, /Clipping workflow/);
  assert.match(route, /Real clip library/);
  assert.match(route, /score_reason/);
  assert.match(route, /transcript_excerpt/);
  assert.match(route, /cancelCreatorJob/);
  assert.match(route, /rerenderCreatorClip/);
  assert.match(service, /rpc\("cancel_creator_job"/);
  assert.match(service, /rpc\("enqueue_creator_rerender"/);
  assert.match(worker, /diversify\(scored, 3\)/);
  assert.match(worker, /render_version:/);
  assert.match(workerDomain, /if \(out\.length\) return out/);
  assert.match(workerDomain, /const maxWindow = Math\.min\(60_000/);
  assert.match(workerDomain, /require spoken text|require spoken|text\) out\.push/i);
  assert.doesNotMatch(route, /const\s+(?:demo|sample|fake)Clips?\s*=/i);
});

test("E24 persists only provider-returned analytics and removes the invalid YouTube videos mine query", async () => {
  const sync = await read("supabase/functions/creator-analytics-sync/index.ts");

  assert.match(sync, /creator_analytics_content/);
  assert.match(sync, /creator_analytics_snapshots/);
  assert.match(sync, /granted_metric_names/);
  assert.match(sync, /provider_payload_fingerprint/);
  assert.match(sync, /youtube\/v3\/channels/);
  assert.match(sync, /youtube\/v3\/playlistItems/);
  assert.match(sync, /youtube\/v3\/videos/);
  assert.doesNotMatch(sync, /youtube\/v3\/videos\?[^"\n]*mine=true/);
  assert.match(sync, /open\.tiktokapis\.com\/v2\/video\/list/);
  assert.match(sync, /view_count/);
  assert.match(sync, /like_count/);
  assert.match(sync, /comment_count/);
  assert.match(sync, /share_count/);
  assert.doesNotMatch(sync, /(?:view_count|like_count|comment_count|share_count|viewCount|likeCount|commentCount)\s*\?\?\s*0/);
});

test("E24 web analytics are connection-aware, explicitly synced, and contain no sample chart series", async () => {
  const [route, service] = await Promise.all([
    read("src/routes/_shell.creator.tsx"),
    read("src/services/creator-service.ts"),
  ]);

  assert.match(route, /Provider-verified analytics/);
  assert.match(route, /Connect YouTube/);
  assert.match(route, /Sync analytics/);
  assert.match(route, /creator_analytics_snapshots/);
  assert.match(route, /creator_analytics_content/);
  assert.match(service, /"creator-oauth-start"/);
  assert.match(service, /"creator-analytics-sync"/);
  assert.match(service, /startCreatorProviderConnection/);
  assert.match(service, /syncCreatorProviderAnalytics/);
  assert.match(service, /disconnectCreatorProvider/);
  assert.doesNotMatch(route, /sampleData|mockChart|fakeAnalytics/i);
});
