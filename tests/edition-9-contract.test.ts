import { describe, expect, it } from "vitest";
import { KIVRYN_ACTION_REGISTRY } from "../supabase/functions/_shared/kivryn-action-registry";
import { parseKivrynActionPlan } from "../supabase/functions/_shared/kivryn-agentic-plan";
import { fingerprintKivrynPlan } from "../supabase/functions/_shared/kivryn-action-approval";
import { prepareKivrynExecution } from "../supabase/functions/_shared/kivryn-action-execution";

describe("Edition 9 Agentic Core Action Layer", () => {
  it("keeps the full plan -> approval -> existing executor command chain fail-closed", () => {
    const plan = parseKivrynActionPlan({ version: 1, intent: "Prepare study sprint", steps: [
      { id: "study", action: "create_study_goal", input: { action_type: "create_study_goal", title: "Finish module", subject_id: "11111111-1111-4111-8111-111111111111" } },
    ] }, ["studies"]);
    expect(plan).not.toBeNull();
    expect(KIVRYN_ACTION_REGISTRY.create_study_goal.requiresApproval).toBe(true);
    const commands = prepareKivrynExecution({ plan: plan!, runId: "agent-run", requestId: "request", approval: {
      planFingerprint: fingerprintKivrynPlan(plan!), approvedStepIds: ["study"], approvedAt: new Date().toISOString(),
    } });
    expect(commands).toHaveLength(1);
    expect(commands[0].action.action_type).toBe("create_study_goal");
  });
});
