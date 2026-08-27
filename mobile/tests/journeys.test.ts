import { describe, expect, test } from "bun:test";
import {
  calculateStreak,
  canActivateJourney,
  getChallengeProgress,
  getMissionExecutionTarget,
  getTodayMission,
  localDateKey,
  selectDailyMission,
  stableMission,
  summarizeMomentum,
  type JourneyMission,
} from "../lib/journeys";
const project = { id: "p", title: "P", description: "", status: "active" };
const task = (patch: Record<string, unknown> = {}) => ({
  id: "t",
  title: "Task",
  description: "",
  priority: "medium",
  dueDate: null,
  projectId: null,
  completed: false,
  ...patch,
});
describe("Journeys domain", () => {
  test("enforces Free active limit and permits Premium", () => {
    expect(canActivateJourney(0, 1)).toBe(true);
    expect(canActivateJourney(1, 1)).toBe(false);
    expect(canActivateJourney(12, null)).toBe(true);
  });
  test("preserves downgrade data by only gating activation", () =>
    expect(canActivateJourney(2, 1)).toBe(false));
  test("prioritizes overdue and excludes completed", () =>
    expect(
      selectDailyMission(
        [
          task({ id: "today", dueDate: "2026-08-26" }),
          task({ id: "old", dueDate: "2026-08-25" }),
          task({ id: "done", dueDate: "2026-08-20", completed: true }),
        ],
        [project],
        [],
        new Date(2026, 7, 26),
      )?.sourceId,
    ).toBe("old"));
  test("prioritizes today and supports Study", () => {
    expect(
      selectDailyMission(
        [task({ id: "next", nextAction: "go" }), task({ id: "today", dueDate: "2026-08-26" })],
        [project],
        [],
        new Date(2026, 7, 26),
      )?.sourceId,
    ).toBe("today");
    expect(
      selectDailyMission(
        [],
        [],
        [
          {
            id: "s",
            name: "English",
            description: "",
            status: "active",
            color: "#fff",
            nextAction: "25 min",
          },
        ],
        new Date(),
      )?.sourceType,
    ).toBe("study_session");
  });
  test("excludes paused project work", () =>
    expect(
      selectDailyMission(
        [task({ projectId: "p" })],
        [{ ...project, status: "paused" }],
        [],
        new Date(),
      ),
    ).toBeNull());
  test("keeps the same daily mission", () => {
    const existing = { id: "m", scheduledDate: "2026-08-26", status: "active" } as JourneyMission;
    expect(
      stableMission(
        existing,
        { sourceType: "task", sourceId: "other", title: "Other", description: null, rank: 0 },
        "2026-08-26",
      ),
    ).toBe(existing);
  });
  test("uses local boundaries", () =>
    expect(localDateKey(new Date(2026, 0, 2, 0, 1))).toBe("2026-01-02"));
  test("derives execution streaks", () => {
    expect(calculateStreak(["2026-08-24", "2026-08-25", "2026-08-26"], new Date(2026, 7, 26))).toBe(
      3,
    );
    expect(calculateStreak(["2026-08-24"], new Date(2026, 7, 26))).toBe(0);
  });
  test("a completed mission is not returned as today's active mission", () => {
    expect(getTodayMission({ status: "completed" } as JourneyMission)).toBeNull();
    expect(
      stableMission(
        { scheduledDate: "2026-08-26", status: "completed" } as JourneyMission,
        null,
        "2026-08-26",
      ),
    ).toBeNull();
  });
  test("high-impact overdue work wins deterministically and duplicates do not duplicate candidates", () => {
    const result = selectDailyMission(
      [
        task({ id: "low", dueDate: "2026-08-25", priority: "low" }),
        task({ id: "high", dueDate: "2026-08-25", priority: "high" }),
        task({ id: "high", dueDate: "2026-08-25", priority: "high" }),
      ],
      [project],
      [],
      new Date(2026, 7, 26),
    );
    expect(result?.sourceId).toBe("high");
  });
  test("returns no fabricated mission without actionable workspace data", () =>
    expect(selectDailyMission([], [], [], new Date())).toBeNull());
  test("derives total, Monday-based weekly Momentum and streak only from verified missions", () => {
    const events = [
      {
        id: "old",
        journeyId: null,
        sourceType: "mission",
        sourceId: "a",
        eventType: "mission_completed",
        points: 40,
        createdAt: "2026-08-23T12:00:00Z",
      },
      {
        id: "mon",
        journeyId: null,
        sourceType: "mission",
        sourceId: "b",
        eventType: "mission_completed",
        points: 100,
        createdAt: "2026-08-24T12:00:00Z",
      },
      {
        id: "tue",
        journeyId: null,
        sourceType: "mission",
        sourceId: "c",
        eventType: "mission_completed",
        points: 100,
        createdAt: "2026-08-25T12:00:00Z",
      },
      {
        id: "open",
        journeyId: null,
        sourceType: "app",
        sourceId: "d",
        eventType: "app_open",
        points: 5,
        createdAt: "2026-08-26T12:00:00Z",
      },
    ];
    const summary = summarizeMomentum(events, new Date(2026, 7, 26, 15));
    expect(summary.totalPoints).toBe(245);
    expect(summary.weekPoints).toBe(205);
    expect(summary.completedMissions).toBe(2);
    expect(summary.streak).toBe(3);
  });
  test("caps challenge progress and resolves completion deterministically", () => {
    const progress = getChallengeProgress({
      targetValue: 5,
      progress: 8,
      completedAt: null,
    } as never);
    expect(progress).toEqual({ progress: 5, target: 5, percentage: 100, completed: true });
  });
  test("routes each verified source to its canonical execution target", () => {
    const base = { status: "active", sourceId: "source", journeyId: "journey" } as JourneyMission;
    expect(getMissionExecutionTarget({ ...base, sourceType: "task" })?.href).toBe("/tasks/source");
    expect(getMissionExecutionTarget({ ...base, sourceType: "study_session" })?.href).toBe(
      "/studies/source",
    );
    expect(
      getMissionExecutionTarget({ ...base, sourceType: "journey_action" })?.canCompleteDirectly,
    ).toBe(true);
    expect(
      getMissionExecutionTarget({ ...base, sourceType: "journey_action", journeyId: null }),
    ).toBeNull();
  });
});
