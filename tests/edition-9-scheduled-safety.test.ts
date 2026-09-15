import { describe, expect, it } from "vitest";
import { prepareAgenticCoreRun } from "../supabase/functions/_shared/kivryn-agentic-core";

describe("Edition 9 scheduled safety", () => {
  it("does not infer approval from a run identifier or scheduling context", () => {
    const result = prepareAgenticCoreRun({ capabilities: ["study"], proposedPlan: { version: 1, intent: "daily study", steps: [{ id: "goal", action: "create_study_goal", input: { action_type: "create_study_goal", title: "Study", subject_id: "11111111-1111-4111-8111-111111111111" } }] }, runId: "scheduled_2026_09_15", requestId: "cron" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.commands).toEqual([]);
  });
});
