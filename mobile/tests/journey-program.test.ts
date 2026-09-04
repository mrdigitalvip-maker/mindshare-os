import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { buildJourneyProgramState, type JourneyProgramStepRecord } from "../lib/journeys";
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const records: JourneyProgramStepRecord[] = [
  {
    id: "three",
    sequence: 3,
    phase: "revisar",
    title: "C",
    description: "C",
    required: true,
    completedAt: null,
  },
  {
    id: "one",
    sequence: 1,
    phase: "descobrir",
    title: "A",
    description: "A",
    required: true,
    completedAt: null,
  },
  {
    id: "two",
    sequence: 2,
    phase: "executar",
    title: "B",
    description: "B",
    required: true,
    completedAt: null,
  },
];
describe("Journey program persisted read model", () => {
  test("orders instances and marks current then upcoming at 0/3", () => {
    const state = buildJourneyProgramState("journey", records)!;
    expect(state.steps.map((step) => step.id)).toEqual(["one", "two", "three"]);
    expect(state.steps.map((step) => step.status)).toEqual(["current", "upcoming", "upcoming"]);
    expect(state.completedSteps).toBe(0);
    expect(state.progressRatio).toBe(0);
  });
  test("completed_at alone completes and advances current at 1/3", () => {
    const state = buildJourneyProgramState(
      "journey",
      records.map((step) =>
        step.id === "one" ? { ...step, completedAt: "2026-09-02T10:00:00Z" } : step,
      ),
    )!;
    expect(state.steps.map((step) => step.status)).toEqual(["completed", "current", "upcoming"]);
    expect(state.currentStep?.id).toBe("two");
    expect(state.progressRatio).toBeCloseTo(1 / 3);
  });
  test("3/3 completes and duplicate IDs never count twice", () => {
    const completed = records.map((step) => ({ ...step, completedAt: "2026-09-02T10:00:00Z" }));
    const state = buildJourneyProgramState("journey", [...completed, completed[0]])!;
    expect(state.totalSteps).toBe(3);
    expect(state.completedSteps).toBe(3);
    expect(state.progressRatio).toBe(1);
    expect(state.currentStep).toBeNull();
  });
  test("no persisted instances means no fabricated program", () =>
    expect(buildJourneyProgramState("custom", [])).toBeNull());
});
describe("Journey program mobile integration contract", () => {
  const detail = read("../app/(app)/journeys/[journeyId].tsx"),
    hooks = read("../hooks/use-journeys.ts"),
    service = read("../services/journey-service.ts"),
    pack = read("../app/(app)/packs/[slug].tsx");
  test("mission failure cannot hide program and completion stays canonical", () => {
    expect(detail).toContain('copyKey="legacy.78eb480b96e2"');
    expect(detail).toContain("program.isError");
    expect(hooks).toContain("service.completeJourneyAction");
    expect(service).toContain('supabase.rpc("complete_journey_action"');
    expect(service).not.toContain('.from("journey_pack_step_instances").update');
    expect(service).not.toContain('.from("momentum_events").insert');
  });
  test("confirmed completion invalidates program, mission, Momentum, detail, and list", () => {
    for (const value of [
      "queryKeys.journeyProgram",
      "queryKeys.dailyMission",
      "queryKeys.journey(",
      "refresh()",
    ])
      expect(hooks).toContain(value);
  });
  test("Pack preparation uses native date and remains idempotent", () => {
    expect(pack).toContain("<NativeDateField");
    expect(pack).not.toContain("AAAA-MM-DD");
    expect(pack).toContain("requestKey: key.current");
  });
  test("workspace adds no fake popularity or reward data", () => {
    for (const fake of ["Mais usado", "participant", "success rate", "rating", "grantReward"])
      expect(detail).not.toContain(fake);
  });
});
