import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import {
  buildJourneyProgramState,
  getTodayMission,
  orderJourneys,
  type Journey,
  type JourneyMission,
} from "../lib/journeys";

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const service = read("../services/journey-service.ts");
const hooks = read("../hooks/use-journeys.ts");
const detail = read("../app/(app)/journeys/[journeyId].tsx");
const overview = read("../app/(app)/journeys/index.tsx");
const arena = read("../app/(app)/arena.tsx");
const packSql = read("../../supabase/migrations/202608290003_journey_packs_v1.sql");
const r10Sql = read("../../supabase/migrations/202609020001_execution_loop_revision_10.sql");
const hardening = read(
  "../../supabase/migrations/202608270003_journeys_momentum_challenges_hardening.sql",
);

describe("R10 truthful execution loop", () => {
  test("mission RPC stays server-owned, owner/day locked, and unique", () => {
    expect(service).toContain('supabase.rpc("ensure_daily_journey_mission"');
    expect(packSql).toContain("pg_advisory_xact_lock");
    expect(packSql).toContain("user_id=uid and scheduled_date=p_local_date");
    expect(read("../../supabase/migrations/202608260003_journeys_foundation.sql")).toContain(
      "unique(user_id, scheduled_date)",
    );
  });

  test("mission failure is auxiliary and uses safe PT-BR copy", () => {
    expect(overview).toContain("Não foi possível atualizar a missão de hoje.");
    expect(overview).toContain("Suas Jornadas continuam disponíveis.");
    expect(overview.indexOf("if (journeys.isError)")).toBeGreaterThan(-1);
  });

  test("completed mission is not exposed as today's target", () => {
    const mission = { status: "completed" } as JourneyMission;
    expect(getTodayMission(mission)).toBeNull();
    expect(overview).toContain("getTodayMission(mission.data)");
  });

  test("Pack state selects first incomplete and completion has no invented next step", () => {
    const state = buildJourneyProgramState("j", [
      {
        id: "2",
        sequence: 2,
        phase: "B",
        title: "B",
        description: "B",
        required: true,
        completedAt: null,
      },
      {
        id: "1",
        sequence: 1,
        phase: "A",
        title: "A",
        description: "A",
        required: true,
        completedAt: "2026-09-02",
      },
    ])!;
    expect(state.currentStep?.id).toBe("2");
    const done = buildJourneyProgramState(
      "j",
      state.steps.map((step) => ({ ...step, completedAt: "2026-09-02" })),
    )!;
    expect(done.currentStep).toBeNull();
    expect(detail).toContain("PROGRAMA CONCLUÍDO");
  });

  test("manual Journey fabricates neither roadmap nor next action", () => {
    expect(buildJourneyProgramState("manual", [])).toBeNull();
    expect(detail).toContain("Defina o próximo passo desta Jornada.");
    expect(detail).toContain("Planejar com a NEXORA");
  });

  test("rapid completion has a synchronous guard and canonical RPC", () => {
    expect(detail).toContain("completionGuard.current");
    expect(detail).toContain("mutateAsync(current.id)");
    expect(service).toContain('supabase.rpc("complete_journey_action"');
  });

  test("completion atomically validates the Pack step and closes the Program", () => {
    expect(r10Sql).toContain("returning id into changed_step");
    expect(r10Sql).toContain("raise exception 'pack_step_not_found'");
    expect(r10Sql).toContain("set status = 'completed'");
    expect(r10Sql).toContain("perform public.apply_verified_mission_effects(result)");
  });

  test("Momentum is verified, retry-safe, and never client-written", () => {
    expect(hardening).toContain("if inserted_event is null then return");
    expect(service).not.toContain('.from("momentum_events").insert');
    expect(detail).not.toContain("grantReward");
  });

  test("Arena renders only persisted challenges without rank or participants", () => {
    expect(arena).toContain("arena.data ?? []");
    expect(arena).not.toMatch(/fake|avatar|leaderboard|participantCount/);
  });

  test("Journey list deduplicates and deterministically prioritizes active work", () => {
    const base = {
      title: "J",
      category: "custom",
      objective: "O",
      context: null,
      startDate: "2026-09-01",
      targetDate: null,
      createdAt: "2026-09-01",
      sourcePackId: null,
      sourcePackVersion: null,
    } as const;
    const completed = { ...base, id: "c", status: "completed", updatedAt: "2026-09-02" } as Journey;
    const active = { ...base, id: "a", status: "active", updatedAt: "2026-09-01" } as Journey;
    expect(orderJourneys([completed, active, active]).map((j) => j.id)).toEqual(["a", "c"]);
  });

  test("targeted invalidations cover Mission, Program, Home domains, Momentum and Arena", () => {
    for (const token of [
      "queryKeys.dailyMission",
      "queryKeys.journeyProgram",
      "queryKeys.momentum",
      "queryKeys.arena",
    ])
      expect(`${hooks}\n${read("../lib/query-keys.ts")}`).toContain(token);
  });

  test("Free authority and Home mission dedup remain intact", () => {
    expect(read("../../supabase/migrations/202608260003_journeys_foundation.sql")).toContain(
      "create trigger journeys_free_limit",
    );
    expect(read("../app/(app)/(tabs)/dashboard.tsx")).toContain("shouldShowSecondaryMission");
  });
});
