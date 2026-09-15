import { describe, expect, it } from "vitest";
import { fingerprintKivrynPlan } from "../supabase/functions/_shared/kivryn-action-approval";
import { prepareKivrynExecution } from "../supabase/functions/_shared/kivryn-action-execution";
import { parseKivrynActionPlan } from "../supabase/functions/_shared/kivryn-agentic-plan";

describe("Edition 9 action normalization", () => {
  it("forces the registry-backed action name into executor payload", () => {
    const plan = parseKivrynActionPlan({ version: 1, intent: "x", steps: [{ id: "s", action: "create_task", input: { action_type: "create_task", title: "X" } }] }, ["tasks"])!;
    const commands = prepareKivrynExecution({ plan, runId: "r", requestId: "q", approval: { planFingerprint: fingerprintKivrynPlan(plan), approvedStepIds: ["s"], approvedAt: new Date().toISOString() } });
    expect(commands[0].action.action_type).toBe("create_task");
  });
});
