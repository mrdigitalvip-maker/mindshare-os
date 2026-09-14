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

export async function loadDashboardDailyMission(): Promise<DashboardMission | null> {
  // Ensure the restored browser session is ready before the security-definer RPC
  // runs. This is especially important immediately after OAuth redirects.
  await getRequiredUserId();

  const { data, error } = await client.rpc("ensure_daily_journey_mission", {
    p_local_date: localDateKey(),
  });
  if (error) throw new Error(error.message || "daily_mission_failed");

  const candidate = Array.isArray(data) ? data[0] : data;
  if (candidate == null) return null;
  if (!isMission(candidate)) throw new Error("invalid_daily_mission_response");
  return candidate;
}
