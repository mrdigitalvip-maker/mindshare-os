import { supabase } from "@/lib/supabase";

export type AgentPlanStep = {
  id: string;
  action: string;
  domain: "tasks" | "projects" | "studies";
  input: Record<string, unknown>;
  requiresApproval: true;
};

export type AgentActionPlan = {
  version: 1;
  intent: string;
  steps: AgentPlanStep[];
};

export type AgentRuntimeResult = {
  runId: string;
  output: string;
  contextScopes: string[];
  skillIds: string[];
  connectorIds: string[];
  subagentIds: string[];
  actionPlan: AgentActionPlan | null;
  planFingerprint: string | null;
  approvalRequired: boolean;
  openaiResponseId: string | null;
};

export type PendingAgentPlan = {
  runId: string;
  agentId: string;
  createdAt: string;
  plan: AgentActionPlan;
  planFingerprint: string;
  status: "pending_approval" | "partially_applied";
  appliedStepIds: string[];
};

export type AgentActionAuditStatus =
  | "approval_required"
  | "approved"
  | "applied"
  | "rejected"
  | "failed"
  | "uncertain";

export type AgentActionAuditEvent = {
  id: string;
  agentId: string;
  runId: string;
  stepId: string;
  actionType: string;
  domain: "tasks" | "projects" | "studies" | "integrations";
  status: AgentActionAuditStatus;
  resourceId: string | null;
  provider: "gmail" | "google_calendar" | "google_drive" | null;
  externalResourceRef: string | null;
  idempotent: boolean | null;
  errorCode: string | null;
  occurredAt: string;
};

async function authenticatedUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão autenticada necessária.");
  return data.user.id;
}

export const AgentRuntimeService = {
  async run(agentId: string, input: string): Promise<AgentRuntimeResult> {
    await authenticatedUserId();
    const { data, error } = await supabase.functions.invoke<{
      ok: boolean;
      data?: AgentRuntimeResult;
      error?: { code?: string; message?: string };
    }>("agent-run", { body: { agentId, input } });
    if (error) throw error;
    if (!data?.ok || !data.data) throw new Error(data?.error?.message ?? "A execução falhou.");
    return data.data;
  },

  async review(input: {
    runId: string;
    planFingerprint: string;
    decision: "approve" | "reject";
    approvedStepIds?: string[];
  }) {
    await authenticatedUserId();
    const { data, error } = await supabase.functions.invoke<{
      ok: boolean;
      data?: { runId: string; status: string; appliedStepIds: string[] };
      error?: { code?: string; message?: string };
    }>("agent-action-review", { body: input });
    if (error) throw error;
    if (!data?.ok || !data.data) throw new Error(data?.error?.message ?? "A revisão falhou.");
    return data.data;
  },

  async listPending(agentId?: string): Promise<PendingAgentPlan[]> {
    const userId = await authenticatedUserId();
    let query = (supabase as any)
      .from("agent_runs")
      .select(
        "id,agent_id,created_at,action_plan,action_plan_fingerprint,action_plan_status,applied_step_ids",
      )
      .eq("user_id", userId)
      .in("action_plan_status", ["pending_approval", "partially_applied"])
      .order("created_at", { ascending: false })
      .limit(20);
    if (agentId) query = query.eq("agent_id", agentId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? [])
      .filter(
        (row: any) =>
          row.action_plan &&
          typeof row.action_plan_fingerprint === "string" &&
          (row.action_plan_status === "pending_approval" ||
            row.action_plan_status === "partially_applied"),
      )
      .map((row: any) => ({
        runId: row.id,
        agentId: row.agent_id,
        createdAt: row.created_at,
        plan: row.action_plan as AgentActionPlan,
        planFingerprint: row.action_plan_fingerprint,
        status: row.action_plan_status,
        appliedStepIds: Array.isArray(row.applied_step_ids) ? row.applied_step_ids : [],
      }));
  },

  async listAudit(agentId: string, limit = 100): Promise<AgentActionAuditEvent[]> {
    const userId = await authenticatedUserId();
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
    const { data, error } = await (supabase as any)
      .from("agent_action_audit_events")
      .select(
        "id,agent_id,run_id,step_id,action_type,domain,status,resource_id,provider,external_resource_ref,idempotent,error_code,occurred_at",
      )
      .eq("user_id", userId)
      .eq("agent_id", agentId)
      .order("occurred_at", { ascending: false })
      .limit(safeLimit);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      agentId: row.agent_id,
      runId: row.run_id,
      stepId: row.step_id,
      actionType: row.action_type,
      domain: row.domain,
      status: row.status,
      resourceId: row.resource_id ?? null,
      provider: row.provider ?? null,
      externalResourceRef: row.external_resource_ref ?? null,
      idempotent: typeof row.idempotent === "boolean" ? row.idempotent : null,
      errorCode: row.error_code ?? null,
      occurredAt: row.occurred_at,
    }));
  },
};
