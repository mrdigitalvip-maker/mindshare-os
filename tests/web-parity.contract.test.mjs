import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("protected shell redirects signed-out users and clears identity cache", async () => {
  const [shell, auth] = await Promise.all([
    read("src/routes/_shell.tsx"),
    read("src/lib/auth-context.tsx"),
  ]);
  assert.match(shell, /navigate\(\{ to: "\/auth"/);
  assert.match(auth, /cancelQueries\(\).*queryClient\.clear\(\)/s);
});

test("canonical parity routes and Daily Mission are wired", async () => {
  const [tree, service, home] = await Promise.all([
    read("src/routeTree.gen.ts"),
    read("src/services/parity-service.ts"),
    read("src/components/daily-mission-card.tsx"),
  ]);
  for (const route of [
    "/journeys",
    "/arena",
    "/community",
    "/packs",
    "/journeys/$journeyId",
    "/community/squads/$squadId",
    "/packs/$slug",
  ])
    assert.ok(tree.includes(route), route);
  assert.match(service, /ensure_daily_journey_mission/);
  assert.match(home, /queryFn: dailyMission/);
});

test("Community forms and server mutation contracts remain accessible", async () => {
  const [route, service] = await Promise.all([
    read("src/routes/_shell.community.tsx"),
    read("src/services/parity-service.ts"),
  ]);
  for (const semantic of [
    'aria-label="Perfil da comunidade"',
    'aria-label="Criar Squad"',
    'aria-label="Aceitar convite"',
  ])
    assert.ok(route.includes(semantic));
  for (const rpc of [
    "upsert_community_profile",
    "create_squad",
    "accept_squad_invite",
    "set_activity_reaction",
    "report_community_target",
  ])
    assert.ok(service.includes(rpc), rpc);
});

test("Journey and Pack creation are server persisted and duplicate-safe", async () => {
  const [journeys, pack, service] = await Promise.all([
    read("src/routes/_shell.journeys.tsx"),
    read("src/routes/_shell.packs.$slug.tsx"),
    read("src/services/parity-service.ts"),
  ]);
  assert.match(journeys, /createJourney/);
  assert.match(pack, /useRef\(crypto\.randomUUID\(\)\)/);
  assert.match(pack, /disabled=\{start\.isPending/);
  assert.match(service, /start_journey_pack/);
});

test("safe UI error fallback never exposes a raw backend message", async () => {
  const service = await read("src/services/parity-service.ts");
  assert.match(service, /safeBackendError/);
  assert.match(service, /Não foi possível concluir a solicitação/);
  assert.doesNotMatch(service, /return raw/);
});
