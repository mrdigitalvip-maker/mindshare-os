import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import {
  journeyMissionFromRpc,
  requestDailyMission,
  requestJourneyActionCompletion,
  type JourneyRpc,
} from "../lib/daily-mission-runtime";
import { getMissionExecutionTarget, getTodayMission, localDateKey } from "../lib/journeys";

const row = {
  id: "mission-1",
  user_id: "user-1",
  journey_id: "journey-1",
  source_type: "journey_action",
  source_id: "step-1",
  title: "Faça a etapa",
  description: "Uma ação real",
  status: "active",
  scheduled_date: "2026-09-03",
  momentum_value: 100,
  completed_at: null,
  created_at: "2026-09-03T10:00:00Z",
  updated_at: "2026-09-03T10:00:00Z",
} as const;
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
function rpcReturning(data: unknown, calls: Array<[string, Record<string, string>]>): JourneyRpc {
  return async (name, args) => {
    calls.push([name, args]);
    return { data, error: null };
  };
}

describe("R14 Daily Mission runtime contract", () => {
  test("uses the device-local calendar date and sends exactly p_local_date", async () => {
    const date = new Date(2026, 8, 3, 0, 1);
    expect(localDateKey(date)).toBe("2026-09-03");
    const calls: Array<[string, Record<string, string>]> = [];
    await requestDailyMission(" user-1 ", date, rpcReturning([row], calls));
    expect(calls).toEqual([["ensure_daily_journey_mission", { p_local_date: "2026-09-03" }]]);
  });
  test("rejects a blank identity before invoking the RPC", async () => {
    let invoked = false;
    await expect(
      requestDailyMission("  ", new Date(), async () => {
        invoked = true;
        return { data: null, error: null };
      }),
    ).rejects.toThrow("Authenticated user required");
    expect(invoked).toBe(false);
  });
  test("maps every legitimate null composite representation to no mission", () => {
    expect(journeyMissionFromRpc(null)).toBeNull();
    expect(journeyMissionFromRpc([])).toBeNull();
    expect(journeyMissionFromRpc([{ id: null, source_id: null }])).toBeNull();
  });
  test("maps object and singleton composite row shapes completely", () => {
    for (const payload of [row, [row]])
      expect(journeyMissionFromRpc(payload)).toEqual({
        id: "mission-1",
        journeyId: "journey-1",
        sourceType: "journey_action",
        sourceId: "step-1",
        title: "Faça a etapa",
        description: "Uma ação real",
        status: "active",
        scheduledDate: "2026-09-03",
        momentumValue: 100,
        completedAt: null,
        createdAt: "2026-09-03T10:00:00Z",
      });
  });
  test("fails safely on malformed and ambiguous payloads", () => {
    expect(() => journeyMissionFromRpc([{ id: undefined }])).toThrow(
      "INVALID_DAILY_MISSION_RESPONSE",
    );
    expect(() => journeyMissionFromRpc([row, row])).toThrow("INVALID_DAILY_MISSION_RESPONSE");
  });
  test("completed and skipped existing missions are not active targets", () => {
    expect(getTodayMission({ ...journeyMissionFromRpc(row)!, status: "completed" })).toBeNull();
    expect(getTodayMission({ ...journeyMissionFromRpc(row)!, status: "skipped" })).toBeNull();
  });
  test("routes task, study, and valid Pack actions without broken Journey URLs", () => {
    const mission = journeyMissionFromRpc(row)!;
    expect(getMissionExecutionTarget({ ...mission, sourceType: "task" })?.href).toBe(
      "/tasks/step-1",
    );
    expect(getMissionExecutionTarget({ ...mission, sourceType: "study_session" })?.href).toBe(
      "/studies/step-1",
    );
    expect(getMissionExecutionTarget(mission)?.href).toBe("/journeys/journey-1");
    expect(getMissionExecutionTarget({ ...mission, journeyId: null })).toBeNull();
  });
  test("keeps RPC failures distinct from a successful no-candidate result", async () => {
    await expect(
      requestDailyMission("u", new Date(), async () => ({
        data: null,
        error: new Error("offline"),
      })),
    ).rejects.toThrow("offline");
    await expect(
      requestDailyMission("u", new Date(), async () => ({ data: null, error: null })),
    ).resolves.toBeNull();
  });
  test("retry delegates idempotency to the unique server contract without client inserts", async () => {
    const calls: Array<[string, Record<string, string>]> = [];
    const rpc = rpcReturning([row], calls);
    const date = new Date(2026, 8, 3);
    expect(await requestDailyMission("u", date, rpc)).toEqual(
      await requestDailyMission("u", date, rpc),
    );
    expect(calls).toHaveLength(2);
    expect(read("../services/journey-service.ts")).not.toContain(
      '.from("journey_missions").insert',
    );
  });
  test("completion calls only the canonical server-owned RPC and normalizes its row", async () => {
    const calls: Array<[string, Record<string, string>]> = [];
    expect(
      (await requestJourneyActionCompletion("u", " mission-1 ", rpcReturning([row], calls))).id,
    ).toBe("mission-1");
    expect(calls).toEqual([["complete_journey_action", { p_mission: "mission-1" }]]);
    const service = read("../services/journey-service.ts");
    for (const table of [
      "journey_missions",
      "journey_pack_step_instances",
      "momentum_events",
      "user_challenges",
    ])
      expect(service).not.toContain(`.from("${table}").update`);
  });
  test("completion refreshes Mission, Journey, Program, Momentum, and Arena truth", () => {
    const code = `${read("../hooks/use-journeys.ts")}\n${read("../lib/query-keys.ts")}`;
    for (const token of [
      "queryKeys.dailyMission",
      "queryKeys.journey",
      "queryKeys.journeyProgram",
      "queryKeys.momentum",
      "queryKeys.arena",
    ])
      expect(code).toContain(token);
  });
  test("Home distinguishes failure with retry while null retains calm behavior", () => {
    const home = read("../app/(app)/(tabs)/dashboard.tsx");
    expect(home).toContain("dailyMission.isError");
    expect(home).toContain("dailyMission.refetch()");
    expect(home).toContain("Seu espaço está livre agora.");
  });
});
