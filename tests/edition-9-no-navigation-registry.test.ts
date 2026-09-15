import { describe, expect, it } from "vitest";
import { KIVRYN_ACTION_REGISTRY } from "../supabase/functions/_shared/kivryn-action-registry";

describe("Edition 9 registry scope", () => {
  it("contains workspace mutations, not client navigation commands", () => {
    expect(Object.keys(KIVRYN_ACTION_REGISTRY).some((name) => name.startsWith("navigate_"))).toBe(false);
  });
});
