import { resolveAgentActionDomains } from "./kivryn-agent-capabilities.ts";
import { createKivrynActionAuditEvent } from "./kivryn-action-audit.ts";
import { fingerprintKivrynPlan } from "./kivryn-action-approval.ts";
import { prepareKivrynExecution } from "./kivryn-action-execution.ts";
import { parseKivrynActionPlan } from "./kivryn-agentic-plan.ts";

/** Shared boundary for manual and scheduled Agents. It never mutates workspace data directly. */
export function prepareAgenticCoreRun(input: {
  capabilities: unknown;
  proposedPlan: unknown;
  approval?: unknown;
  runId: string;
  requestId: string;
}) {
  const allowedDomains = resolveAgentActionDomains(input.capabilities);
  const plan = parseKivrynActionPlan(input.proposedPlan, allowedDomains);
  if (!plan) return { ok: false as const, code: "invalid_or_unauthorized_plan" as const };

  const audit = plan.steps.map((step) => createKivrynActionAuditEvent({
    runId: input.runId,
    stepId: step.id,
    action: step.action,
    domain: step.domain,
    status: "approval_required",
  })!);

  const commands = prepareKivrynExecution({
    plan,
    approval: input.approval,
    runId: input.runId,
    requestId: input.requestId,
  });

  return {
    ok: true as const,
    plan,
    planFingerprint: fingerprintKivrynPlan(plan),
    approvalRequired: commands.length !== plan.steps.length,
    commands,
    audit,
  };
}
