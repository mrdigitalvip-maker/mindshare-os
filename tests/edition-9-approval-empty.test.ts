import { describe, expect, it } from "vitest";
import { fingerprintKivrynPlan, validateKivrynApproval } from "../supabase/functions/_shared/kivryn-action-approval";
import { parseKivrynActionPlan } from "../supabase/functions/_shared/kivryn-agentic-plan";

describe("Edition 9 approval minimum", () => {
  it("rejects an approval grant with no selected steps", () => {
    const plan = parseKivrynActionPlan({ version: 1, intent: "x", steps: [{ id: "s", action: "create_task", input: { action_type: "create_task", title: "x" } }] }, ["tasks"])!;
    expect(validateKivrynApproval(plan, { planFingerprint: fingerprintKivrynPlan(plan), approvedStepIds: [], approvedAt: new Date().toISOString() })).toBeNull();
  });
});
