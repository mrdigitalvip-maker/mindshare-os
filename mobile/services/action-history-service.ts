import { supabase } from "@/lib/supabase";

export type MobileActionHistoryStatus = "applying" | "applied" | "failed" | "uncertain";
export type MobileActionHistoryDomain = "tasks" | "projects" | "studies" | "integrations" | "other";

export type MobileActionHistoryItem = {
  id: string;
  actionType: string;
  domain: MobileActionHistoryDomain;
  status: MobileActionHistoryStatus;
  resourceId: string | null;
  provider: string | null;
  externalResourceRef: string | null;
  errorCode: string | null;
  createdAt: string;
  appliedAt: string | null;
};

async function userId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão autenticada necessária.");
  return data.user.id;
}

function domainFor(actionType: string): MobileActionHistoryDomain {
  if (actionType.includes("task")) return "tasks";
  if (actionType.includes("project")) return "projects";
  if (actionType.includes("study") || actionType.includes("subject")) return "studies";
  if (
    actionType === "send_email" ||
    actionType === "create_calendar_event" ||
    actionType === "create_drive_text_file"
  ) return "integrations";
  return "other";
}

function statusFor(value: unknown): MobileActionHistoryStatus {
  return value === "failed" || value === "applying" || value === "uncertain" ? value : "applied";
}

export async function listMobileActionHistory(limit = 6): Promise<MobileActionHistoryItem[]> {
  const uid = await userId();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  const { data, error } = await (supabase as any)
    .from("nexora_action_runs")
    .select("id,action_type,status,resource_id,provider,external_resource_ref,error_code,created_at,applied_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    actionType: row.action_type ?? "unknown",
    domain: domainFor(row.action_type ?? ""),
    status: statusFor(row.status),
    resourceId: row.resource_id ?? null,
    provider: row.provider ?? null,
    externalResourceRef: row.external_resource_ref ?? null,
    errorCode: row.error_code ?? null,
    createdAt: row.created_at,
    appliedAt: row.applied_at ?? null,
  }));
}
