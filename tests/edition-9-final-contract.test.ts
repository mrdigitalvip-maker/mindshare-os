import { describe, expect, it } from "vitest";
import { KIVRYN_ACTION_REGISTRY } from "../supabase/functions/_shared/kivryn-action-registry";

describe("Edition 9 final invariant", () => {
  it("keeps KIVRYN as the permission authority", () => {
    expect(Object.values(KIVRYN_ACTION_REGISTRY).every((action) => action.requiresApproval && ["tasks", "projects", "studies"].includes(action.domain))).toBe(true);
  });
});
