import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const migration = read("supabase/migrations/202609180003_community_e27_entitlement_visibility.sql");
const community = read("src/routes/_shell.community.tsx");
const chat = read("src/routes/_shell.community.$channelId.tsx");
const service = read("src/services/parity-service.ts");
const arena = read("src/routes/_shell.arena.tsx");
const challengesService = read("src/services/challenges-web-service.ts");

test("E27 filters official communities server-side by entitlement", () => {
  assert.match(migration, /public\.has_premium\(auth\.uid\(\)\)/);
  assert.match(migration, /not c\.requires_premium or viewer\.premium/);
  assert.match(migration, /'eligible', true/);
  assert.match(migration, /grant execute on function public\.get_official_communities\(\) to authenticated/);
});

test("E27 Web exposes only backend-returned official communities", () => {
  assert.match(community, /listOfficialCommunities/);
  assert.match(community, /channel\.premium \? "Premium" : "Free"/);
  assert.match(community, /to="\/community\/\$channelId"/);
  assert.doesNotMatch(community, /premium_required.*router/i);
});

test("E27 Web conversation uses canonical RPC messages and official identity", () => {
  assert.match(chat, /listOfficialCommunityMessages/);
  assert.match(chat, /sendOfficialCommunityMessage/);
  assert.match(chat, /subscribeOfficialCommunity/);
  assert.match(chat, /KIVRYN • OFICIAL/);
  assert.match(service, /rpc<OfficialCommunityMessage\[]>\("get_community_messages"/);
  assert.match(service, /"send_community_message"/);
  assert.match(service, /p_client_request_id: requestId/);
  assert.doesNotMatch(service, /\.from\(["']community_messages["']\)\.(?:insert|update|delete)/);
});

test("E28 Web Arena keeps server-authoritative challenge participation", () => {
  assert.match(arena, /listArena/);
  assert.match(arena, /joinArena/);
  assert.match(arena, /WorkspaceProgress/);
  assert.match(service, /"get_arena_challenges"/);
  assert.match(service, /"join_arena_challenge"/);
});

test("E28 Web Arena surfaces the existing privacy-safe ranking without inventing a new mechanic", () => {
  assert.match(arena, /getWebChallengeRanking/);
  assert.match(arena, /ranking\.data\.entries/);
  assert.match(arena, /to="\/challenges"/);
  assert.doesNotMatch(arena, /setWebChallengeRankingOptIn/);
  assert.match(challengesService, /"get_challenge_ranking"/);
});
