import { describe, expect, it } from "vitest";
import { prepareAgenticCoreRun } from "../supabase/functions/_shared/kivryn-agentic-core";

describe("Edition 9 module smoke", () => {
  it("loads and rejects an empty plan safely", () => {
    expect(prepareAgenticCoreRun({ capabilities: ["productivity"], proposedPlan: null, runId: "r", requestId: "q" }).ok).toBe(false);
  });
});
