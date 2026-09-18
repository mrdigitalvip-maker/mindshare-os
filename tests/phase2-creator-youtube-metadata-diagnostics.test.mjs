import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const service = read("src/services/creator-service.ts");
const route = read("src/routes/_shell.creator.tsx");
const edge = read("supabase/functions/creator-youtube-metadata/index.ts");

test("Creator preserves safe Edge error codes instead of collapsing every YouTube failure", () => {
  assert.match(service, /CreatorYouTubeMetadataError/);
  assert.match(service, /context as Response/);
  for (const code of [
    "configuration_error",
    "origin_not_allowed",
    "unauthorized",
    "invalid_youtube_url",
    "quota_check_failed",
    "daily_limit_reached",
    "youtube_provider_configuration",
    "youtube_provider_quota",
    "youtube_video_not_found",
    "youtube_metadata_unavailable",
  ]) {
    assert.match(service, new RegExp(code));
  }
});

test("Web Creator renders bilingual safe diagnostics without exposing raw provider responses", () => {
  assert.match(route, /creatorYouTubeMetadataErrorMessage/);
  assert.match(route, /A integração de metadados do YouTube não está configurada no servidor/);
  assert.match(route, /YouTube metadata integration is not configured on the server/);
  assert.match(route, /A configuração da YouTube Data API precisa ser revisada/);
  assert.doesNotMatch(route, /Could not inspect this YouTube link\. Try again or upload the original video\./);
});

test("YouTube Edge keeps metadata-only behavior and classifies provider failures safely", () => {
  assert.match(edge, /downloadAvailable:\s*false/);
  assert.match(edge, /originalUploadRequired:\s*true/);
  assert.match(edge, /youtube_provider_quota/);
  assert.match(edge, /youtube_provider_configuration/);
  assert.match(edge, /quotaExceeded/);
  assert.match(edge, /accessNotConfigured/);
  assert.doesNotMatch(edge, /youtube-dl|yt-dlp|download.*youtube/i);
});

test("YouTube Edge still fails closed when required server configuration is missing", () => {
  assert.match(edge, /Deno\.env\.get\("YOUTUBE_API_KEY"\)/);
  assert.match(edge, /code: "configuration_error"/);
  assert.match(edge, /code: "unauthorized"/);
  assert.match(edge, /claim_feature_usage/);
});
