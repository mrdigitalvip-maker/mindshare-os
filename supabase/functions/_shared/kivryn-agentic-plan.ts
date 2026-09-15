import {
  getKivrynActionDefinition,
  isKivrynActionAllowed,
  validateKivrynActionInput,
  type KivrynActionDomain,
  type KivrynActionName,
} from "./kivryn-action-registry.ts";

export interface KivrynPlanStep {
  id: string;
  action: KivrynActionName;
  input: Record<string, unknown>;
  domain: KivrynActionDomain;
  requiresApproval: true;
}

export interface KivrynActionPlan {
  version: 1;
  intent: string;
  steps: KivrynPlanStep[];
}

const safeId = /^[a-zA-Z0-9_-]{1,64}$/;

/** Parse planner/model output as untrusted input and return only executable registry-backed steps. */
export function parseKivrynActionPlan(value: unknown, allowedDomains: readonly KivrynActionDomain[]): KivrynActionPlan | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== 1 || typeof candidate.intent !== "string" || !candidate.intent.trim()) return null;
  if (!Array.isArray(candidate.steps) || candidate.steps.length < 1 || candidate.steps.length > 8) return null;

  const steps: KivrynPlanStep[] = [];
  for (const raw of candidate.steps) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const step = raw as Record<string, unknown>;
    if (typeof step.id !== "string" || !safeId.test(step.id)) return null;
    if (typeof step.action !== "string" || !isKivrynActionAllowed(step.action, allowedDomains)) return null;
    if (!validateKivrynActionInput(step.action, step.input)) return null;
    const definition = getKivrynActionDefinition(step.action);
    if (!definition || !definition.requiresApproval) return null;
    steps.push({
      id: step.id,
      action: step.action as KivrynActionName,
      input: step.input as Record<string, unknown>,
      domain: definition.domain,
      requiresApproval: true,
    });
  }

  if (new Set(steps.map((step) => step.id)).size !== steps.length) return null;
  return { version: 1, intent: candidate.intent.trim().slice(0, 500), steps };
}
