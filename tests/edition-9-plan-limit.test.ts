import { describe, expect, it } from "vitest";
import { parseKivrynActionPlan } from "../supabase/functions/_shared/kivryn-agentic-plan";

describe("Edition 9 bounded plans", () => {
  it("accepts up to eight authorized steps and rejects nine", () => {
    const steps = Array.from({ length: 8 }, (_, index) => ({ id: `s${index}`, action: "create_task", input: { action_type: "create_task", title: `Task ${index}` } }));
    expect(parseKivrynActionPlan({ version: 1, intent: "batch", steps }, ["tasks"])?.steps).toHaveLength(8);
    expect(parseKivrynActionPlan({ version: 1, intent: "batch", steps: [...steps, { ...steps[0], id: "s8" }] }, ["tasks"])).toBeNull();
  });
});
