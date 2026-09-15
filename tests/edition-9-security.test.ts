import { describe, expect, it } from "vitest";
import { KIVRYN_ACTION_REGISTRY, validateKivrynActionInput } from "../supabase/functions/_shared/kivryn-action-registry";
import { prepareAgenticCoreRun } from "../supabase/functions/_shared/kivryn-agentic-core";

describe("Edition 9 security invariants", () => {
  it("has no mutation that bypasses approval", () => {
    expect(Object.values(KIVRYN_ACTION_REGISTRY).filter((action) => action.risk === "mutation" && !action.requiresApproval)).toEqual([]);
  });

  it("rejects payload privilege expansion", () => {
    expect(validateKivrynActionInput("create_project", { action_type: "create_project", title: "X", user_id: "other-user" })).toBe(false);
  });

  it("does not give scheduled/manual agent preparation implicit authority", () => {
    const result = prepareAgenticCoreRun({ capabilities: ["planning"], proposedPlan: { version: 1, intent: "Create project", steps: [{ id: "p", action: "create_project", input: { action_type: "create_project", title: "X" } }] }, runId: "scheduled-run", requestId: "req" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.commands).toHaveLength(0);
  });
});
