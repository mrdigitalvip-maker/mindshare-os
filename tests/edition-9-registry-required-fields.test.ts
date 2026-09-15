import { describe, expect, it } from "vitest";
import { validateKivrynActionInput } from "../supabase/functions/_shared/kivryn-action-registry";

describe("Edition 9 required fields", () => {
  it("requires resource ids for update operations", () => {
    expect(validateKivrynActionInput("complete_task", { action_type: "complete_task" })).toBe(false);
    expect(validateKivrynActionInput("complete_task", { action_type: "complete_task", resource_id: "11111111-1111-4111-8111-111111111111" })).toBe(true);
  });
});
