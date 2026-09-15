import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("web Daily Mission treats the RPC no-candidate composite as an empty state", async () => {
  const service = await read("src/services/dashboard-mission-service.ts");

  assert.match(service, /export function dashboardMissionFromRpc/);
  assert.match(service, /if \(payload == null\) return null/);
  assert.match(service, /if \(payload\.length === 0\) return null/);
  assert.match(service, /if \(payload\.length !== 1\) throw new Error\("invalid_daily_mission_response"\)/);
  assert.match(service, /values\.every\(\(value\) => value === null\)\) return null/);
  assert.match(service, /return dashboardMissionFromRpc\(data\)/);
});

test("Daily Mission keeps real failures separate from the legitimate empty state", async () => {
  const [service, card] = await Promise.all([
    read("src/services/dashboard-mission-service.ts"),
    read("src/components/daily-mission-card.tsx"),
  ]);

  assert.match(service, /if \(error\) throw new Error\(error\.message \|\| "daily_mission_failed"\)/);
  assert.match(service, /if \(!isMission\(row\)\) throw new Error\("invalid_daily_mission_response"\)/);
  assert.match(card, /q\.isError/);
  assert.match(card, /q\.refetch\(\)/);
  assert.match(card, /q\.data \?/);
  assert.match(card, /home\.missionEmpty/);
});

test("server contract intentionally returns null when there is no eligible source", async () => {
  const migration = await read(
    "supabase/migrations/202608270003_journeys_momentum_challenges_hardening.sql",
  );

  assert.match(migration, /ensure_daily_journey_mission\(p_local_date date\)/);
  assert.match(migration, /if candidate\.source_id is null then return null; end if;/);
});
