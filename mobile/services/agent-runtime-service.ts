import { supabase } from "@/lib/supabase";

export type MobileAgentPlanStep = {
  id: string;
  action: string;
  domain: "tasks" | "projects" | "studies";
  input: Record<string, unknown>;
  requiresApproval: true;
};

export type MobileAgentActionPlan = {
  version: 1;
  intent: string;
  steps: MobileAgentPlanStep[];
};

export type MobileAgentRuntimeResult = {
  runId: string;
  output: string;
  contextScopes: string[];
  skillIds: string[];
  connectorIds: string[];
  subagentIds: string[];
  actionPlan: MobileAgentActionPlan | null;
  planFingerprint: string | null;
  approvalRequired: boolean;
  openaiResponseId: string | null;
};

export type MobilePendingAgentPlan = {
  runId: string;
  agentId: string;
  createdAt: string;
  planFingerprint: string;
  status: "pending_approval" | "partially_applied";
  appliedStepIds: string[];
  plan: MobileAgentActionPlan;
};

async function userId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão autenticada necessária.");
  return data.user.id;
}

export async function runMobileAgent(agentId: string, input: string): Promise<MobileAgentRuntimeResult> {
  await userId();
  const cleanInput = input.trim();
  if (!cleanInput) throw new Error("Digite uma solicitação para o Agent.");
  const { data, error } = await supabase.functions.invoke<{
    ok: boolean;
    data?: MobileAgentRuntimeResult;
    error?: { code?: string; message?: string };
  }>("agent-run", { body: { agentId, input: cleanInput } });
  if (error) throw error;
  if (!data?.ok || !data.data) throw new Error(data?.error?.message ?? "A execução falhou.");
  return data.data;
}

export async function listMobilePendingAgentPlans(limit = 10): Promise<MobilePendingAgentPlan[]> {
  const uid = await userId();
  const safeLimit = Math.max(1, Math.min(20, Math.floor(limit)));
  const { data, error } = await (supabase as any)
    .from("agent_runs")
    .select(
      "id,agent_id,created_at,action_plan,action_plan_fingerprint,action_plan_status,applied_step_ids",
    )
    .eq("user_id", uid)
    .in("action_plan_status", ["pending_approval", "partially_applied"])
    .order("created_at", { ascending: false })
    .limit(safeLimit);
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
      planFingerprint: row.action_plan_fingerprint,
      status: row.action_plan_status,
      appliedStepIds: Array.isArray(row.applied_step_ids) ? row.applied_step_ids : [],
      plan: row.action_plan,
    }));
}

export async function reviewMobileAgentPlan(input: {
  runId: string;
  planFingerprint: string;
  decision: "approve" | "reject";
  approvedStepIds?: string[];
}) {
  await userId();
  const { data, error } = await supabase.functions.invoke<{
    ok: boolean;
    data?: { runId: string; status: string; appliedStepIds: string[] };
    error?: { message?: string };
  }>("agent-action-review", { body: input });
  if (error) throw error;
  if (!data?.ok || !data.data) throw new Error(data?.error?.message ?? "Não foi possível revisar o plano.");
  return data.data;
}
