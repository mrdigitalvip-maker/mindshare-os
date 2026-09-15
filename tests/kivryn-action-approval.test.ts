import { describe, expect, it } from "vitest";
import { parseKivrynActionPlan } from "../supabase/functions/_shared/kivryn-agentic-plan";
import { approvedKivrynSteps, fingerprintKivrynPlan, validateKivrynApproval } from "../supabase/functions/_shared/kivryn-action-approval";

const plan = parseKivrynActionPlan({ version: 1, intent: "Prepare launch", steps: [
  { id: "one", action: "create_project", input: { action_type: "create_project", title: "Launch" } },
  { id: "two", action: "create_task", input: { action_type: "create_task", title: "Publish" } },
] }, ["tasks", "projects"])!;

describe("KIVRYN approval boundary", () => {
  it("binds approval to the exact plan fingerprint", () => {
    const grant = validateKivrynApproval(plan, { planFingerprint: fingerprintKivrynPlan(plan), approvedStepIds: ["one"], approvedAt: new Date().toISOString() });
    expect(grant).not.toBeNull();
    expect(approvedKivrynSteps(plan, grant!).map((step) => step.id)).toEqual(["one"]);
  });

  it("rejects stale or forged approval", () => {
    expect(validateKivrynApproval(plan, { planFingerprint: "kap1_deadbeef", approvedStepIds: ["one"], approvedAt: new Date().toISOString() })).toBeNull();
    expect(validateKivrynApproval(plan, { planFingerprint: fingerprintKivrynPlan(plan), approvedStepIds: ["unknown"], approvedAt: new Date().toISOString() })).toBeNull();
  });
});
