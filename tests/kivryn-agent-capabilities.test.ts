import { describe, expect, it } from "vitest";
import { resolveAgentActionDomains } from "../supabase/functions/_shared/kivryn-agent-capabilities";

describe("Agent capability → action authority", () => {
  it("grants only domains represented by existing capabilities", () => {
    expect(resolveAgentActionDomains(["productivity"])).toEqual(["tasks", "projects"]);
    expect(resolveAgentActionDomains(["study"])).toEqual(["studies"]);
  });

  it("does not turn writing or unknown capabilities into workspace mutation authority", () => {
    expect(resolveAgentActionDomains(["writing", "summarization", "unknown"])).toEqual([]);
  });
});
