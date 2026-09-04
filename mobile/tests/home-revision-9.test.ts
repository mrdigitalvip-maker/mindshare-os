import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getHomeDaySummary,
  getHomeProjects,
  getNextAction,
  shouldShowSecondaryMission,
} from "../lib/dashboard-selectors";
import type { Project, Task } from "../services/workspace-service";
import { translations } from "../i18n";

const dashboard = readFileSync("app/(app)/(tabs)/dashboard.tsx", "utf8");
const assistant = readFileSync("app/(app)/(tabs)/assistant.tsx", "utf8");
const agent = readFileSync("components/nexora-agent.tsx", "utf8");
const pkg = readFileSync("package.json", "utf8");
const task = (id: string, dueDate: string | null, completed = false): Task => ({
  id,
  title: id,
  description: "",
  priority: "medium",
  dueDate,
  projectId: null,
  completed,
});

test("primary command is deterministic and opens the exact task", () => {
  assert.equal(
    getNextAction([task("later", "2026-09-03"), task("now", "2026-09-02")], new Date(2026, 8, 2))
      ?.id,
    "now",
  );
  assert.match(dashboard, /router\.push\(`\/tasks\/\$\{nextAction\.id\}`\)/);
  assert.match(dashboard, /copyKey="legacy\.f100f18898c7"/);
  assert.equal(
    (translations["pt-BR"] as Record<string, string>)["legacy.f100f18898c7"],
    "Seu espaço está livre agora.",
  );
  assert.equal(
    (translations.en as Record<string, string>)["legacy.f100f18898c7"],
    "Your schedule is clear right now.",
  );
});

test("mission deduplication compares canonical execution targets", () => {
  assert.equal(shouldShowSecondaryMission("/tasks/one", "/tasks/one"), false);
  assert.equal(shouldShowSecondaryMission("/tasks/one", "/journeys/today"), true);
  assert.match(dashboard, /shouldShowSecondaryMission/);
});

test("Home modules fail independently", () => {
  assert.match(dashboard, /todayMission && missionTarget/);
  assert.match(dashboard, /projectsQuery\.isError/);
  assert.match(dashboard, /tasksQuery\.isError/);
  assert.match(dashboard, /Promise\.allSettled/);
});

test("day summary uses only real scoped tasks and has a calm empty state", () => {
  const summary = getHomeDaySummary(
    [task("done", "2026-09-02", true), task("future", "2026-09-03")],
    new Date(2026, 8, 2),
  );
  assert.deepEqual(summary, { completed: 1, pending: 0, total: 1, overdue: 0, percentage: 100 });
  assert.equal(getHomeDaySummary([], new Date(2026, 8, 2)).percentage, null);
  assert.match(dashboard, /copyKey="legacy\.56c547e03285"/);
  assert.equal(
    (translations.en as Record<string, string>)["legacy.56c547e03285"],
    "It's a quiet day. No pending tasks are due.",
  );
  assert.doesNotMatch(dashboard, /produtividade|performance|score/i);
});

test("project previews are bounded", () => {
  const projects: Project[] = Array.from({ length: 6 }, (_, index) => ({
    id: `${index}`,
    title: `${index}`,
    description: "",
    status: "active",
  }));
  assert.equal(getHomeProjects(projects, [], new Date(), 3).length, 3);
});

test("one state-ready agent identity is used on Home and Assistant", () => {
  assert.match(dashboard, /import \{ NexoraAgent \}/);
  assert.match(assistant, /import \{ NexoraAgent \}/);
  for (const state of [
    "idle",
    "listening",
    "thinking",
    "speaking",
    "attention",
    "success",
    "quiet",
  ])
    assert.match(agent, new RegExp(`${state}:`));
  assert.match(agent, /NEXORA disponível/);
  assert.match(agent, /AccessibilityInfo\.isReduceMotionEnabled/);
  assert.match(agent, /2800 \+ Math\.floor\(Math\.random\(\) \* 3600\)/);
  assert.match(agent, /clearTimeout\(timer\.current\)/);
  assert.doesNotMatch(pkg, /lottie/i);
});
