import { describe, expect, it } from "vitest";
import { fingerprintKivrynPlan } from "../supabase/functions/_shared/kivryn-action-approval";
import { prepareKivrynExecution } from "../supabase/functions/_shared/kivryn-action-execution";
import { parseKivrynActionPlan } from "../supabase/functions/_shared/kivryn-agentic-plan";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("Edition 10 existing executor compatibility", () => {
  it("prepares UUID ids accepted by apply_nexora_action(uuid, uuid, ...)", () => {
    const plan = parseKivrynActionPlan(
      {
        version: 1,
        intent: "Create launch task",
        steps: [
          {
            id: "launch_task",
            action: "create_task",
            input: { action_type: "create_task", title: "Launch" },
          },
        ],
      },
      ["tasks"],
    )!;
    const commands = prepareKivrynExecution({
      plan,
      runId: "agent-run-1",
      requestId: "request-1",
      approval: {
        planFingerprint: fingerprintKivrynPlan(plan),
        approvedStepIds: ["launch_task"],
        approvedAt: "2026-09-15T00:00:00.000Z",
      },
    });
    expect(commands).toHaveLength(1);
    expect(commands[0].actionId).toMatch(uuid);
    expect(commands[0].requestId).toMatch(uuid);
  });
});
