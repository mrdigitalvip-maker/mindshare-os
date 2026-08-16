import { supabase } from "@/lib/supabase";

export type MobileProfile = { id: string; fullName: string | null; onboarded: boolean };

export async function getProfile(userId: string): Promise<MobileProfile | null> {
  const id = userId.trim();
  if (!id) throw new Error("Authenticated user ID is required.");
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, onboarded")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, fullName: data.full_name, onboarded: data.onboarded === true };
}

export async function updateProfileName(userId: string, fullName: string): Promise<void> {
  const id = userId.trim();
  const name = fullName.trim();
  if (!id || !name) throw new Error("Name is required.");
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: name, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
