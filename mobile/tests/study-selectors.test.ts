import assert from "node:assert/strict";
import test from "node:test";
import {
  getStudyProgress,
  getSubjectLastSession,
  getTodayStudyMinutes,
  getWeeklyStudyMinutes,
  reconstructElapsedSeconds,
  selectStudyFocus,
  uniqueSubjects,
} from "../lib/study-selectors";
import type { StudySession, SubjectWorkspace } from "../services/workspace-service";
const session = (
  id: string,
  createdAt: string,
  duration = 25,
  status: StudySession["status"] = "completed",
): StudySession => ({
  id,
  activity: id,
  duration,
  createdAt,
  status,
  plannedMinutes: 25,
  startedAt: createdAt,
  endedAt: status === "completed" ? createdAt : null,
  reflection: null,
});
const workspace = (
  id: string,
  sessions: StudySession[] = [],
  nextAction = "",
  goals: SubjectWorkspace["goals"] = [],
): SubjectWorkspace => ({
  subject: {
    id,
    name: id,
    description: "",
    status: "active",
    color: "#B9854B",
    objective: "learn",
    weeklyTargetMinutes: 120,
    nextAction,
  },
  sessions,
  goals,
  notes: [],
});
const now = new Date("2026-08-26T12:00:00Z");
test("no subjects and duplicate IDs", () => {
  assert.equal(selectStudyFocus([]), null);
  assert.equal(uniqueSubjects([workspace("a").subject, workspace("a").subject]).length, 1);
});
test("subject without sessions is actionable", () =>
  assert.equal(selectStudyFocus([workspace("a")])?.subject.id, "a"));
test("unfinished goal beats completed goal", () => {
  const open = { id: "g", title: "goal", completed: false, currentValue: 0, targetValue: 2 };
  assert.equal(
    selectStudyFocus([
      workspace("done", [], "", [{ ...open, completed: true }]),
      workspace("open", [], "", [open]),
    ])?.subject.id,
    "open",
  );
});
test("next action influences focus", () =>
  assert.equal(
    selectStudyFocus([
      workspace("goal", [], "", [
        { id: "g", title: "g", completed: false, currentValue: 0, targetValue: 1 },
      ]),
      workspace("action", [], "chapter"),
    ])?.subject.id,
    "action",
  ));
test("today and weekly totals respect boundaries", () => {
  const rows = [
    session("today", "2026-08-26T08:00:00Z", 30),
    session("monday", "2026-08-24T08:00:00Z", 20),
    session("old", "2026-08-23T08:00:00Z", 40),
  ];
  assert.equal(getTodayStudyMinutes(rows, now), 30);
  assert.equal(getWeeklyStudyMinutes(rows, now), 50);
});
test("selects last session", () =>
  assert.equal(
    getSubjectLastSession([
      session("old", "2026-08-24T08:00:00Z"),
      session("new", "2026-08-25T08:00:00Z"),
    ])?.id,
    "new",
  ));
test("reconstructs active elapsed time", () =>
  assert.equal(
    reconstructElapsedSeconds(session("active", "2026-08-26T11:58:30Z", 0, "active"), now),
    90,
  ));
test("builds truthful progress", () => {
  const w = workspace("a", [session("one", "2026-08-26T08:00:00Z", 25)], "", [
    { id: "g", title: "g", completed: true, currentValue: 1, targetValue: 1 },
  ]);
  assert.deepEqual(getStudyProgress(w, now), {
    todayMinutes: 25,
    weeklyMinutes: 25,
    weeklyTargetMinutes: 120,
    sessions: 1,
    completedGoals: 1,
  });
});
