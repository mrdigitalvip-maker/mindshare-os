import type { KivrynActionPlan } from "./kivryn-agentic-plan.ts";

export interface KivrynApprovalGrant {
  planFingerprint: string;
  approvedStepIds: readonly string[];
  approvedAt: string;
}

export function fingerprintKivrynPlan(plan: KivrynActionPlan): string {
  const canonical = JSON.stringify({ version: plan.version, intent: plan.intent, steps: plan.steps });
  let hash = 2166136261;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `kap1_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function validateKivrynApproval(plan: KivrynActionPlan, grant: unknown): KivrynApprovalGrant | null {
  if (!grant || typeof grant !== "object" || Array.isArray(grant)) return null;
  const candidate = grant as Record<string, unknown>;
  if (candidate.planFingerprint !== fingerprintKivrynPlan(plan)) return null;
  if (!Array.isArray(candidate.approvedStepIds) || candidate.approvedStepIds.some((id) => typeof id !== "string")) return null;
  if (typeof candidate.approvedAt !== "string" || Number.isNaN(Date.parse(candidate.approvedAt))) return null;
  const known = new Set(plan.steps.map((step) => step.id));
  const approved = candidate.approvedStepIds as string[];
  if (!approved.length || new Set(approved).size !== approved.length || approved.some((id) => !known.has(id))) return null;
  return { planFingerprint: candidate.planFingerprint as string, approvedStepIds: approved, approvedAt: candidate.approvedAt };
}

export function approvedKivrynSteps(plan: KivrynActionPlan, grant: KivrynApprovalGrant) {
  const approved = new Set(grant.approvedStepIds);
  return plan.steps.filter((step) => approved.has(step.id));
}
