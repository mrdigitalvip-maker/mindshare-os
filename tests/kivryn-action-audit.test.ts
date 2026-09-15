import { describe, expect, it } from "vitest";
import { createKivrynActionAuditEvent } from "../supabase/functions/_shared/kivryn-action-audit";

describe("KIVRYN action audit contract", () => {
  it("records execution metadata without action payload contents", () => {
    const event = createKivrynActionAuditEvent({ runId: "run", stepId: "step", action: "create_task", domain: "tasks", status: "applied", resourceId: "11111111-1111-4111-8111-111111111111", idempotent: false });
    expect(event).toMatchObject({ runId: "run", action: "create_task", status: "applied", idempotent: false });
    expect(event).not.toHaveProperty("input");
  });
});
