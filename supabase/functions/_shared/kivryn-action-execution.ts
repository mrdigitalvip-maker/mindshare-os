import { approvedKivrynSteps, validateKivrynApproval } from "./kivryn-action-approval.ts";
import { deterministicKivrynUuid } from "./kivryn-ids.ts";
import type { KivrynActionPlan } from "./kivryn-agentic-plan.ts";

export interface KivrynExecutionCommand {
  actionId: string;
  requestId: string;
  stepId: string;
  action: Record<string, unknown>;
}

function safeToken(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

/**
 * Convert only explicitly approved plan steps into commands for the existing
 * apply_nexora_action executor. This layer does not write workspace data itself.
 */
export function prepareKivrynExecution(input: {
  plan: KivrynActionPlan;
  approval: unknown;
  runId: string;
  requestId: string;
}): KivrynExecutionCommand[] {
  const grant = validateKivrynApproval(input.plan, input.approval);
  if (!grant) return [];
  const run = safeToken(input.runId);
  const request = safeToken(input.requestId);
  if (!run || !request) return [];
  return approvedKivrynSteps(input.plan, grant).map((step) => ({
    actionId: deterministicKivrynUuid(`action:${run}:${step.id}`),
    requestId: deterministicKivrynUuid(`request:${request}:${run}:${step.id}`),
    stepId: step.id,
    action: { ...step.input, action_type: step.action },
  }));
}
