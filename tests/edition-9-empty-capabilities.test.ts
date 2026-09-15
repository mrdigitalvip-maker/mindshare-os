import { describe, expect, it } from "vitest";
import { resolveAgentActionDomains } from "../supabase/functions/_shared/kivryn-agent-capabilities";

describe("Edition 9 empty authority", () => {
  it("defaults malformed or absent Agent capabilities to no workspace authority", () => {
    expect(resolveAgentActionDomains(null)).toEqual([]);
    expect(resolveAgentActionDomains("productivity")).toEqual([]);
    expect(resolveAgentActionDomains([])).toEqual([]);
  });
});
