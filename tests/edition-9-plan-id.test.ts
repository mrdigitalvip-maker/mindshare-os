import { describe, expect, it } from "vitest";
import { parseKivrynActionPlan } from "../supabase/functions/_shared/kivryn-agentic-plan";

describe("Edition 9 step ids", () => {
  it("rejects unsafe step identifiers", () => {
    expect(parseKivrynActionPlan({ version: 1, intent: "x", steps: [{ id: "../../x", action: "create_task", input: { action_type: "create_task", title: "X" } }] }, ["tasks"])).toBeNull();
  });
});
