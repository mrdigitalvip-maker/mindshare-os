import { DEMO_MODE } from "@/lib/demo/config";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";
import { getRequiredUserId } from "./supabase-service";

type PreferenceRow = Database["public"]["Tables"]["user_preferences"]["Row"];
type PreferenceInsert = Database["public"]["Tables"]["user_preferences"]["Insert"];
type PreferenceUpdate = Database["public"]["Tables"]["user_preferences"]["Update"];
type PreferenceKey = Exclude<keyof PreferenceRow, "id" | "user_id" | "created_at" | "updated_at">;

export const SettingsService = {
  getNotificationDefaults() {
    return { dailyBriefing: true, goalReminders: true };
  },
  async list(): Promise<PreferenceRow[]> {
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("user_preferences")
      .select(
        "id, ai_model, created_at, daily_goal, language, theme, timezone, updated_at, user_id, week_start",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async getByKey<K extends PreferenceKey>(key: K): Promise<PreferenceRow[K] | null> {
    const preference = (await this.list())[0];
    return preference?.[key] ?? null;
  },
  async create(input: Omit<PreferenceInsert, "id" | "user_id">): Promise<PreferenceRow> {
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("user_preferences")
      .insert({ ...input, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async update(id: string, patch: PreferenceUpdate): Promise<void> {
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("user_preferences")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
  async upsert(input: Omit<PreferenceInsert, "id" | "user_id">): Promise<PreferenceRow> {
    const userId = await getRequiredUserId();
    const current = (await this.list())[0];
    if (!current) return this.create(input);
    const { data, error } = await supabase
      .from("user_preferences")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", current.id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async remove(id: string): Promise<void> {
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("user_preferences")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
  isDemoMode: DEMO_MODE,
};
