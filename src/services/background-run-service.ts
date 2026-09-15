import { supabase } from "@/lib/supabase";

export type BackgroundRunStatus = "queued" | "running" | "retry_wait" | "completed" | "failed";

export type BackgroundAgentRun = {
  id: string;
  agentId: string | null;
  status: BackgroundRunStatus;
  trigger: "scheduled" | "system";
  scheduledFor: string | null;
  attemptCount: number;
  retryAfter: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  errorCode: string | null;
  contextScopes: string[];
  createdAt: string;
};

export const BackgroundRunService = {
  async list(limit = 20): Promise<BackgroundAgentRun[]> {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error("Authenticated session required.");
    const boundedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
    const { data, error } = await (supabase as any)
      .from("agent_runs")
      .select(
        "id,agent_id,status,trigger,scheduled_for,attempt_count,retry_after,started_at,finished_at,error_code,context_scopes,created_at",
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
      startedAt: row.started_at ?? null,
      finishedAt: row.finished_at ?? null,
      errorCode: row.error_code ?? null,
      contextScopes: Array.isArray(row.context_scopes) ? row.context_scopes : [],
      createdAt: row.created_at,
    }));
  },
};
