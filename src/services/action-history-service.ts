import { supabase } from "@/lib/supabase";
import { getRequiredUserId } from "./supabase-service";

export type ActionHistoryStatus = "applying" | "applied" | "failed" | "uncertain";
export type ActionHistoryDomain = "tasks" | "projects" | "studies" | "integrations" | "other";

export type ActionHistoryItem = {
  id: string;
  requestId: string;
  conversationId: string | null;
  actionType: string;
  domain: ActionHistoryDomain;
  status: ActionHistoryStatus;
  resourceId: string | null;
  provider: string | null;
  externalResourceRef: string | null;
  errorCode: string | null;
  createdAt: string;
  appliedAt: string | null;
};

function domainFor(actionType: string): ActionHistoryDomain {
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

function normalizeStatus(value: unknown): ActionHistoryStatus {
  return value === "failed" || value === "applying" || value === "uncertain"
    ? value
    : "applied";
}

export const ActionHistoryService = {
  async list(limit = 20): Promise<ActionHistoryItem[]> {
    const userId = await getRequiredUserId();
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    const { data, error } = await (supabase as any)
      .from("nexora_action_runs")
      .select(
        "id,request_id,conversation_id,action_type,status,resource_id,provider,external_resource_ref,error_code,created_at,applied_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(safeLimit);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      requestId: row.request_id,
      conversationId: row.conversation_id ?? null,
      actionType: row.action_type ?? "unknown",
      domain: domainFor(row.action_type ?? ""),
      status: normalizeStatus(row.status),
      resourceId: row.resource_id ?? null,
      provider: row.provider ?? null,
      externalResourceRef: row.external_resource_ref ?? null,
      errorCode: row.error_code ?? null,
      createdAt: row.created_at,
      appliedAt: row.applied_at ?? null,
    }));
  },
};
