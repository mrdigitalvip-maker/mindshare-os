import { describe, expect, it } from "vitest";
import { fingerprintKivrynPlan } from "../supabase/functions/_shared/kivryn-action-approval";
import { prepareKivrynExecution } from "../supabase/functions/_shared/kivryn-action-execution";
import { parseKivrynActionPlan } from "../supabase/functions/_shared/kivryn-agentic-plan";

const plan = parseKivrynActionPlan({ version: 1, intent: "Do work", steps: [
  { id: "task_1", action: "create_task", input: { action_type: "create_task", title: "First" } },
  { id: "project_1", action: "create_project", input: { action_type: "create_project", title: "Second" } },
] }, ["tasks", "projects"])!;

describe("KIVRYN guarded execution", () => {
  it("emits only approved commands for the existing executor", () => {
    const commands = prepareKivrynExecution({ plan, runId: "run-1", requestId: "req-1", approval: {
      planFingerprint: fingerprintKivrynPlan(plan), approvedStepIds: ["task_1"], approvedAt: new Date().toISOString(),
    } });
    expect(commands).toHaveLength(1);
    expect(commands[0].action).toMatchObject({ action_type: "create_task", title: "First" });
    expect(commands[0].actionId).toContain("task_1");
  });

  it("emits no mutations without valid approval", () => {
    expect(prepareKivrynExecution({ plan, runId: "run-1", requestId: "req-1", approval: null })).toEqual([]);
  });
});
