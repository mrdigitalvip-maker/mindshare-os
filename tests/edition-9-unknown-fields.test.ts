import { describe, expect, it } from "vitest";
import { validateKivrynActionInput } from "../supabase/functions/_shared/kivryn-action-registry";

describe("Edition 9 hidden fields", () => {
  it("rejects owner and entitlement fields supplied by planner output", () => {
    expect(validateKivrynActionInput("create_task", { action_type: "create_task", title: "x", user_id: "x" })).toBe(false);
    expect(validateKivrynActionInput("create_task", { action_type: "create_task", title: "x", premium: true })).toBe(false);
  });
});
