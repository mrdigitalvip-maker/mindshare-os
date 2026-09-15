import type { KivrynActionDomain, KivrynActionName } from "./kivryn-action-registry.ts";

export type KivrynActionAuditStatus = "planned" | "approval_required" | "approved" | "applied" | "rejected" | "failed";

export interface KivrynActionAuditEvent {
  runId: string;
  stepId: string;
  action: KivrynActionName;
  domain: KivrynActionDomain;
  status: KivrynActionAuditStatus;
  resourceId?: string;
  idempotent?: boolean;
  errorCode?: string;
  occurredAt: string;
}

/** Sanitizes the event contract before persistence/logging; action payloads are intentionally excluded. */
export function createKivrynActionAuditEvent(input: Omit<KivrynActionAuditEvent, "occurredAt"> & { occurredAt?: string }): KivrynActionAuditEvent | null {
  if (!input.runId || !input.stepId || !input.action || !input.domain || !input.status) return null;
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(occurredAt))) return null;
  return {
    runId: input.runId.slice(0, 128),
    stepId: input.stepId.slice(0, 64),
    action: input.action,
    domain: input.domain,
    status: input.status,
    ...(input.resourceId ? { resourceId: input.resourceId } : {}),
    ...(typeof input.idempotent === "boolean" ? { idempotent: input.idempotent } : {}),
    ...(input.errorCode ? { errorCode: input.errorCode.slice(0, 80) } : {}),
    occurredAt,
  };
}
