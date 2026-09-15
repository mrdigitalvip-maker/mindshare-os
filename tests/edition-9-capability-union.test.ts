import { describe, expect, it } from "vitest";
import { resolveAgentActionDomains } from "../supabase/functions/_shared/kivryn-agent-capabilities";

describe("Edition 9 capability union", () => {
  it("deduplicates domains across planning and productivity", () => {
    expect(resolveAgentActionDomains(["planning", "productivity", "study"])).toEqual(["tasks", "projects", "studies"]);
  });
});
