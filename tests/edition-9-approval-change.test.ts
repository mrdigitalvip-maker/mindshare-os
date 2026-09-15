import { describe, expect, it } from "vitest";
import { fingerprintKivrynPlan, validateKivrynApproval } from "../supabase/functions/_shared/kivryn-action-approval";
import { parseKivrynActionPlan } from "../supabase/functions/_shared/kivryn-agentic-plan";

describe("Edition 9 plan change approval", () => {
  it("invalidates approval when action contents change", () => {
    const first = parseKivrynActionPlan({ version: 1, intent: "x", steps: [{ id: "s", action: "create_task", input: { action_type: "create_task", title: "A" } }] }, ["tasks"])!;
    const changed = parseKivrynActionPlan({ version: 1, intent: "x", steps: [{ id: "s", action: "create_task", input: { action_type: "create_task", title: "B" } }] }, ["tasks"])!;
    const grant = { planFingerprint: fingerprintKivrynPlan(first), approvedStepIds: ["s"], approvedAt: new Date().toISOString() };
    expect(validateKivrynApproval(first, grant)).not.toBeNull();
    expect(validateKivrynApproval(changed, grant)).toBeNull();
  });
});
