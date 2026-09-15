import { describe, expect, it } from "vitest";
import { createKivrynActionAuditEvent } from "../supabase/functions/_shared/kivryn-action-audit";

describe("Edition 9 audit validation", () => {
  it("rejects invalid timestamps", () => {
    expect(createKivrynActionAuditEvent({ runId: "r", stepId: "s", action: "create_task", domain: "tasks", status: "failed", occurredAt: "not-a-date" })).toBeNull();
  });
});
