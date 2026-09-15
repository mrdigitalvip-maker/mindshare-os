import { describe, expect, it } from "vitest";
import { KIVRYN_ACTION_REGISTRY } from "../supabase/functions/_shared/kivryn-action-registry";

describe("Edition 9 Web/Android authority parity", () => {
  it("keeps workspace authority server-owned rather than platform-specific", () => {
    const actions = Object.keys(KIVRYN_ACTION_REGISTRY);
    expect(actions).toContain("create_task");
    expect(actions).toContain("create_project");
    expect(actions).toContain("create_study_goal");
    expect(actions).not.toContain("navigate_dashboard");
  });
});
