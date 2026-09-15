import { describe, expect, it } from "vitest";
import {
  KIVRYN_ACTION_REGISTRY,
  getKivrynActionDefinition,
  isKivrynActionAllowed,
  validateKivrynActionInput,
} from "../supabase/functions/_shared/kivryn-action-registry";

describe("KIVRYN server-side Action Registry", () => {
  it("registers only the first supported workspace domains", () => {
    expect(new Set(Object.values(KIVRYN_ACTION_REGISTRY).map((action) => action.domain))).toEqual(
      new Set(["tasks", "projects", "studies"]),
    );
  });

  it("requires approval for every mutation in Edition 9", () => {
    expect(Object.values(KIVRYN_ACTION_REGISTRY).every((action) => action.requiresApproval)).toBe(true);
  });

  it("rejects unknown actions instead of pretending they can execute", () => {
    expect(getKivrynActionDefinition("send_email")).toBeNull();
    expect(isKivrynActionAllowed("send_email", ["tasks", "projects", "studies"])).toBe(false);
  });

  it("enforces agent/domain capability boundaries", () => {
    expect(isKivrynActionAllowed("create_task", ["tasks"])).toBe(true);
    expect(isKivrynActionAllowed("create_project", ["tasks"])).toBe(false);
    expect(isKivrynActionAllowed("create_study_goal", ["studies"])).toBe(true);
  });

  it("requires the declared action inputs and rejects extra fields", () => {
    expect(validateKivrynActionInput("create_task", { action_type: "create_task", title: "Ship gate" })).toBe(true);
    expect(validateKivrynActionInput("create_task", { action_type: "create_task" })).toBe(false);
    expect(validateKivrynActionInput("create_task", { action_type: "create_task", title: "Ship gate", admin: true })).toBe(false);
  });
});
