import { describe, expect, it } from "vitest";
import { KIVRYN_ACTION_REGISTRY } from "../supabase/functions/_shared/kivryn-action-registry";

describe("Edition 9 completion contract", () => {
  it("ships a non-empty server-owned action registry", () => expect(Object.keys(KIVRYN_ACTION_REGISTRY).length).toBeGreaterThan(0));
});
