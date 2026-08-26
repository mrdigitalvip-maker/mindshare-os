import { describe, expect, test } from "bun:test";
import {
  calculateStreak,
  canActivateJourney,
  localDateKey,
  selectDailyMission,
  stableMission,
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
});
