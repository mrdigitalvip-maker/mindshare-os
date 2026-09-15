import { describe, expect, it } from "vitest";
import { parseKivrynActionPlan } from "../supabase/functions/_shared/kivryn-agentic-plan";

const taskPlan = {
  version: 1,
  intent: "Create and schedule the launch task",
  steps: [
    { id: "step_1", action: "create_task", input: { action_type: "create_task", title: "Launch KIVRYN" } },
  ],
};

describe("KIVRYN Intent → Plan contract", () => {
  it("accepts a registry-backed plan inside the allowed domain", () => {
    const plan = parseKivrynActionPlan(taskPlan, ["tasks"]);
    expect(plan?.steps[0]).toMatchObject({ action: "create_task", domain: "tasks", requiresApproval: true });
  });

  it("rejects a plan that escapes the agent's allowed domains", () => {
    expect(parseKivrynActionPlan(taskPlan, ["studies"])).toBeNull();
  });

  it("rejects unsupported tools instead of faking execution", () => {
    expect(parseKivrynActionPlan({ ...taskPlan, steps: [{ id: "step_1", action: "send_email", input: { action_type: "send_email", title: "x" } }] }, ["tasks", "projects", "studies"])).toBeNull();
  });

  it("rejects duplicate step ids and oversized plans", () => {
    expect(parseKivrynActionPlan({ ...taskPlan, steps: [taskPlan.steps[0], taskPlan.steps[0]] }, ["tasks"])).toBeNull();
    expect(parseKivrynActionPlan({ ...taskPlan, steps: Array.from({ length: 9 }, (_, index) => ({ ...taskPlan.steps[0], id: `step_${index}` })) }, ["tasks"])).toBeNull();
  });
});
