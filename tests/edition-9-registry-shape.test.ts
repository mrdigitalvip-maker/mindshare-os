import { describe, expect, it } from "vitest";
import { KIVRYN_ACTION_REGISTRY } from "../supabase/functions/_shared/kivryn-action-registry";

describe("Edition 9 registry metadata", () => {
  it("has unique names and explicit field contracts", () => {
    const values = Object.values(KIVRYN_ACTION_REGISTRY);
    expect(new Set(values.map((item) => item.name)).size).toBe(values.length);
    for (const item of values) {
      expect(item.risk).toBe("mutation");
      expect(Array.isArray(item.requiredFields)).toBe(true);
      expect(Array.isArray(item.optionalFields)).toBe(true);
    }
  });
});
