import { supabase } from "@/lib/supabase";

export type MobileBackgroundRun = {
  id: string;
  agentId: string | null;
  status: "queued" | "running" | "retry_wait" | "completed" | "failed";
  trigger: "scheduled" | "system";
  scheduledFor: string | null;
  attemptCount: number;
  retryAfter: string | null;
  errorCode: string | null;
  contextScopes: string[];
  createdAt: string;
};

export async function listMobileBackgroundRuns(limit = 20): Promise<MobileBackgroundRun[]> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Sessão autenticada necessária.");
  const boundedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  const { data, error } = await (supabase as any)
    .from("agent_runs")
    .select(
      "id,agent_id,status,trigger,scheduled_for,attempt_count,retry_after,error_code,context_scopes,created_at",
    )
    .eq("user_id", auth.user.id)
    .in("trigger", ["scheduled", "system"])
    .order("created_at", { ascending: false })
    .limit(boundedLimit);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    agentId: row.agent_id ?? null,
    status: ["queued", "running", "retry_wait", "completed", "failed"].includes(row.status)
      ? row.status
      : "failed",
    trigger: row.trigger === "system" ? "system" : "scheduled",
    scheduledFor: row.scheduled_for ?? null,
    attemptCount: Number(row.attempt_count) || 0,
    retryAfter: row.retry_after ?? null,
    errorCode: row.error_code ?? null,
    contextScopes: Array.isArray(row.context_scopes) ? row.context_scopes : [],
    createdAt: row.created_at,
  }));
}
