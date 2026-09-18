import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const community = read("src/routes/_shell.community.tsx");
const squad = read("src/routes/_shell.community.squads.$squadId.tsx");
const channel = read("src/routes/_shell.community.$channelId.tsx");
const service = read("src/services/parity-service.ts");

test("Community parent renders nested Squad and official-channel routes", () => {
  assert.match(community, /Outlet/);
  assert.match(community, /useRouterState/);
  assert.match(
    community,
    /pathname !== "\/community" && pathname !== "\/community\/" \? <Outlet \/> : <CommunityIndex \/>/,
  );
});

test("Squad list/create navigation targets the canonical nested route", () => {
  assert.ok(community.includes('to: "/community/squads/$squadId"'));
  assert.ok(community.includes('to="/community/squads/$squadId"'));
  assert.match(squad, /getSquad\(squadId\)/);
  assert.match(service, /rpc<SquadDetail \| null>\("get_squad_detail"/);
});

test("Official Community conversation remains a child route rather than a duplicate page", () => {
  assert.match(channel, /createFileRoute\("\/_shell\/community\/\$channelId"\)/);
  assert.match(channel, /listOfficialCommunityMessages\(channelId\)/);
  assert.match(channel, /subscribeOfficialCommunity\(channelId/);
});

test("Community regression fix does not replace canonical server RPCs with local state", () => {
  assert.match(service, /create_squad/);
  assert.match(service, /accept_squad_invite/);
  assert.match(service, /get_squad_detail/);
  assert.doesNotMatch(community, /mock/i);
});
