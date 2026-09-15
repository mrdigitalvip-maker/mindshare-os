import { describe, expect, it } from "vitest";
import { parseKivrynActionPlan } from "../supabase/functions/_shared/kivryn-agentic-plan";

describe("Edition 9 malformed plan handling", () => {
  it.each([null, [], {}, { version: 2, intent: "x", steps: [] }, { version: 1, intent: "", steps: [] }])("rejects malformed planner output", (value) => {
    expect(parseKivrynActionPlan(value, ["tasks", "projects", "studies"])).toBeNull();
  });
});
