import { describe, expect, it } from "vitest";
import { fingerprintKivrynPlan, validateKivrynApproval } from "../supabase/functions/_shared/kivryn-action-approval";
import { parseKivrynActionPlan } from "../supabase/functions/_shared/kivryn-agentic-plan";

describe("Edition 9 approval subsets", () => {
  it("allows the user to approve fewer than all proposed steps", () => {
    const plan = parseKivrynActionPlan({ version: 1, intent: "x", steps: [
      { id: "a", action: "create_task", input: { action_type: "create_task", title: "A" } },
      { id: "b", action: "create_task", input: { action_type: "create_task", title: "B" } },
    ] }, ["tasks"])!;
    expect(validateKivrynApproval(plan, { planFingerprint: fingerprintKivrynPlan(plan), approvedStepIds: ["b"], approvedAt: new Date().toISOString() })?.approvedStepIds).toEqual(["b"]);
  });
});
