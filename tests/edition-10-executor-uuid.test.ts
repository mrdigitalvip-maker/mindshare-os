import { describe, expect, it } from "vitest";
import { deterministicKivrynUuid } from "../supabase/functions/_shared/kivryn-ids";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("Edition 10 executor UUID compatibility", () => {
  it("returns stable UUIDv5-shaped ids for the same input", () => {
    const first = deterministicKivrynUuid("run:step");
    expect(first).toMatch(uuid);
    expect(deterministicKivrynUuid("run:step")).toBe(first);
  });

  it("changes when the idempotency input changes", () => {
    expect(deterministicKivrynUuid("run:one")).not.toBe(deterministicKivrynUuid("run:two"));
  });
});
