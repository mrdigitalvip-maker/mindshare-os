import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getRequiredUserId } from "@/services/supabase-service";

const client = supabase as unknown as SupabaseClient;

export type DashboardMission = {
  id: string;
  journey_id: string | null;
  title: string;
  description: string | null;
  source_type: string;
  source_id: string;
  status: string;
  scheduled_date: string;
  momentum_value: number;
};

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isMission(value: unknown): value is DashboardMission {
  if (!value || typeof value !== "object") return false;
  const mission = value as Partial<DashboardMission>;
  return (
    typeof mission.id === "string" &&
    typeof mission.title === "string" &&
    typeof mission.source_type === "string" &&
    typeof mission.source_id === "string" &&
    typeof mission.status === "string" &&
    typeof mission.scheduled_date === "string" &&
    typeof mission.momentum_value === "number"
  );
}

/**
 * PostgREST can serialize a PostgreSQL NULL composite as an object whose
 * attributes are all null. That is the RPC's legitimate "no mission today"
 * result, not a transport or contract error.
 */
export function dashboardMissionFromRpc(payload: unknown): DashboardMission | null {
  if (payload == null) return null;

  if (Array.isArray(payload)) {
    if (payload.length === 0) return null;
    if (payload.length !== 1) throw new Error("invalid_daily_mission_response");
    return dashboardMissionFromRpc(payload[0]);
  }

  if (typeof payload !== "object") throw new Error("invalid_daily_mission_response");

  const row = payload as Record<string, unknown>;
  const values = Object.values(row);
  if (values.length > 0 && values.every((value) => value === null)) return null;

  if (!isMission(row)) throw new Error("invalid_daily_mission_response");
  return row;
}

export async function loadDashboardDailyMission(): Promise<DashboardMission | null> {
  // Ensure the restored browser session is ready before the security-definer RPC
  // runs. This is especially important immediately after OAuth redirects.
  await getRequiredUserId();

  const { data, error } = await client.rpc("ensure_daily_journey_mission", {
    p_local_date: localDateKey(),
  });
  if (error) throw new Error(error.message || "daily_mission_failed");

  return dashboardMissionFromRpc(data);
}
