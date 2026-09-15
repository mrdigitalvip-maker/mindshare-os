import { describe, expect, it } from "vitest";
import { prepareAgenticCoreRun } from "../supabase/functions/_shared/kivryn-agentic-core";

describe("KIVRYN Agentic Core shared boundary", () => {
  const proposedPlan = { version: 1, intent: "Create task", steps: [
    { id: "one", action: "create_task", input: { action_type: "create_task", title: "Review launch" } },
  ] };

  it("returns an approval-required plan before any mutation command exists", () => {
    const result = prepareAgenticCoreRun({ capabilities: ["productivity"], proposedPlan, runId: "run", requestId: "req" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.approvalRequired).toBe(true);
    expect(result.commands).toEqual([]);
    expect(result.audit[0].status).toBe("approval_required");
  });

  it("fails closed when the agent lacks the workspace capability", () => {
    expect(prepareAgenticCoreRun({ capabilities: ["writing"], proposedPlan, runId: "run", requestId: "req" })).toEqual({ ok: false, code: "invalid_or_unauthorized_plan" });
  });
});
