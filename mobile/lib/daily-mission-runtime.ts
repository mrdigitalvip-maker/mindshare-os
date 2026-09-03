import {
  localDateKey,
  type JourneyMission,
  type MissionSourceType,
  type MissionStatus,
} from "@/lib/journeys";

type RpcResult = { data: unknown; error: unknown };
export type JourneyRpc = (name: string, args: Record<string, string>) => PromiseLike<RpcResult>;
const sourceTypes = new Set<MissionSourceType>([
  "task",
  "study_session",
  "project",
  "journey_action",
]);
const statuses = new Set<MissionStatus>(["pending", "active", "completed", "skipped"]);

function rowFrom(payload: unknown): Record<string, unknown> | null {
  if (payload == null) return null;
  if (Array.isArray(payload)) {
    if (payload.length === 0) return null;
    if (payload.length !== 1) throw new Error("INVALID_DAILY_MISSION_RESPONSE");
    return rowFrom(payload[0]);
  }
  if (typeof payload !== "object") throw new Error("INVALID_DAILY_MISSION_RESPONSE");
  const row = payload as Record<string, unknown>;
  // PostgREST can represent a SQL NULL composite as a row of null attributes.
  const values = Object.values(row);
  if (values.length > 0 && values.every((value) => value === null)) return null;
  return row;
}

const requiredString = (row: Record<string, unknown>, key: string) => {
  const value = row[key];
  if (typeof value !== "string" || !value.trim()) throw new Error("INVALID_DAILY_MISSION_RESPONSE");
  return value;
};

/** Normalize PostgREST's scalar-composite object or singleton-row representation. */
export function journeyMissionFromRpc(payload: unknown): JourneyMission | null {
  const row = rowFrom(payload);
  if (!row) return null;
  const sourceType = row.source_type;
  const status = row.status;
  const momentumValue = row.momentum_value;
  if (
    typeof sourceType !== "string" ||
    !sourceTypes.has(sourceType as MissionSourceType) ||
    typeof status !== "string" ||
    !statuses.has(status as MissionStatus) ||
    typeof momentumValue !== "number" ||
    !Number.isFinite(momentumValue) ||
    (row.journey_id !== null && typeof row.journey_id !== "string") ||
    (row.description !== null && typeof row.description !== "string") ||
    (row.completed_at !== null && typeof row.completed_at !== "string")
  )
    throw new Error("INVALID_DAILY_MISSION_RESPONSE");
  return {
    id: requiredString(row, "id"),
    journeyId: row.journey_id as string | null,
    sourceType: sourceType as MissionSourceType,
    sourceId: requiredString(row, "source_id"),
    title: requiredString(row, "title"),
    description: row.description as string | null,
    status: status as MissionStatus,
    scheduledDate: requiredString(row, "scheduled_date"),
    momentumValue,
    completedAt: row.completed_at as string | null,
    createdAt: requiredString(row, "created_at"),
  };
}

export async function requestDailyMission(userId: string, date: Date, rpc: JourneyRpc) {
  if (!userId.trim()) throw new Error("Authenticated user required.");
  const result = await rpc("ensure_daily_journey_mission", { p_local_date: localDateKey(date) });
  if (result.error) throw result.error;
  return journeyMissionFromRpc(result.data);
}

export async function requestJourneyActionCompletion(
  userId: string,
  missionId: string,
  rpc: JourneyRpc,
) {
  if (!userId.trim()) throw new Error("Authenticated user required.");
  if (!missionId.trim()) throw new Error("Mission required.");
  const result = await rpc("complete_journey_action", { p_mission: missionId.trim() });
  if (result.error) throw result.error;
  const mission = journeyMissionFromRpc(result.data);
  if (!mission) throw new Error("INVALID_DAILY_MISSION_RESPONSE");
  return mission;
}
