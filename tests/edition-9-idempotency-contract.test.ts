import { describe, expect, it } from "vitest";
import { fingerprintKivrynPlan } from "../supabase/functions/_shared/kivryn-action-approval";
import { prepareKivrynExecution } from "../supabase/functions/_shared/kivryn-action-execution";
import { parseKivrynActionPlan } from "../supabase/functions/_shared/kivryn-agentic-plan";

describe("Edition 9 executor id contract", () => {
  it("creates stable action/request ids for retrying the same run and step", () => {
    const plan = parseKivrynActionPlan({ version: 1, intent: "x", steps: [{ id: "s1", action: "create_task", input: { action_type: "create_task", title: "x" } }] }, ["tasks"])!;
    const approval = { planFingerprint: fingerprintKivrynPlan(plan), approvedStepIds: ["s1"], approvedAt: "2026-09-15T00:00:00.000Z" };
    const a = prepareKivrynExecution({ plan, approval, runId: "run", requestId: "request" });
    const b = prepareKivrynExecution({ plan, approval, runId: "run", requestId: "request" });
    expect(a).toEqual(b);
  });
});
