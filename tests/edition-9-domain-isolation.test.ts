import { describe, expect, it } from "vitest";
import { parseKivrynActionPlan } from "../supabase/functions/_shared/kivryn-agentic-plan";

describe("Edition 9 domain isolation", () => {
  it("rejects the whole plan when any step exceeds allowed authority", () => {
    const mixed = { version: 1, intent: "mixed", steps: [
      { id: "t", action: "create_task", input: { action_type: "create_task", title: "T" } },
      { id: "s", action: "create_study_goal", input: { action_type: "create_study_goal", title: "S", subject_id: "11111111-1111-4111-8111-111111111111" } },
    ] };
    expect(parseKivrynActionPlan(mixed, ["tasks"])).toBeNull();
    expect(parseKivrynActionPlan(mixed, ["tasks", "studies"])).not.toBeNull();
  });
});
