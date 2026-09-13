import { type PassportLanguageTrack, type PassportProfile } from "@/lib/passport";
import { workspaceMutationError } from "@/lib/mutation-errors";
import { supabase } from "@/lib/supabase";

const requireUser = (userId: string) => {
  const value = userId.trim();
  if (!value) throw workspaceMutationError(new Error("Authenticated user required."));
  return value;
};

const languageTrackFrom = (row: Record<string, unknown>): PassportLanguageTrack => ({
  id: String(row.id),
  slug: String(row.slug),
  title: String(row.title),
  description: String(row.description ?? ""),
});

const profileFrom = (row: Record<string, unknown>): PassportProfile => ({
  id: String(row.id),
  userId: String(row.user_id),
  trackId: String(row.track_id),
  nativeLocale: typeof row.native_locale === "string" ? row.native_locale : null,
  goal: String(row.goal) as PassportProfile["goal"],
  travelDate: typeof row.travel_date === "string" ? row.travel_date : null,
  dailyMinutes: Number(row.daily_minutes),
  currentLevel: String(row.current_level) as PassportProfile["currentLevel"],
  placementScore: row.placement_score == null ? null : Number(row.placement_score),
  planHorizonDays: Number(row.plan_horizon_days),
  isPrimary: Boolean(row.is_primary),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export type UpsertPassportProfileInput = {
  trackId: string;
  goal: PassportProfile["goal"];
  nativeLocale?: string | null;
  travelDate?: string | null;
  dailyMinutes?: number;
  planHorizonDays?: number;
  isPrimary?: boolean;
};

export async function listPassportLanguageTracks(): Promise<PassportLanguageTrack[]> {
  const { data, error } = await supabase
    .from("studio_tracks")
    .select("id,slug,title,description")
    .eq("category", "language")
    .eq("active", true)
    .order("title", { ascending: true });

  if (error) throw workspaceMutationError(error);
  return (data ?? []).map((row) => languageTrackFrom(row as Record<string, unknown>));
}

export async function listPassportProfiles(userId: string): Promise<PassportProfile[]> {
  const { data, error } = await supabase
    .from("passport_profiles")
    .select(
      "id,user_id,track_id,native_locale,goal,travel_date,daily_minutes,current_level,placement_score,plan_horizon_days,is_primary,created_at,updated_at",
    )
    .eq("user_id", requireUser(userId))
    .order("is_primary", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw workspaceMutationError(error);
  return (data ?? []).map((row) => profileFrom(row as Record<string, unknown>));
}

export async function upsertPassportProfile(
  userId: string,
  input: UpsertPassportProfileInput,
): Promise<PassportProfile> {
  requireUser(userId);
  const trackId = input.trackId.trim();
  if (!trackId) throw workspaceMutationError(new Error("Language track required."));

  const { data, error } = await supabase.rpc("upsert_passport_profile", {
    p_track_id: trackId,
    p_goal: input.goal,
    p_native_locale: input.nativeLocale?.trim() || null,
    p_travel_date: input.travelDate ?? null,
    p_daily_minutes: input.dailyMinutes ?? 15,
    p_plan_horizon_days: input.planHorizonDays ?? 90,
    p_is_primary: input.isPrimary ?? true,
  } as never);

  if (error) throw workspaceMutationError(error);
  return profileFrom(data as unknown as Record<string, unknown>);
}
