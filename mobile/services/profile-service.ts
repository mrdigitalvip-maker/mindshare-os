import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  initialProfileValues,
  normalizeProfileIdentity,
  type ProfileIdentity,
  type ProfileRecord,
} from "@/lib/profile-identity";

export type MobileProfile = ProfileIdentity;

export async function getProfile(userId: string): Promise<MobileProfile | null> {
  const id = userId.trim();
  if (!id) throw new Error("Authenticated user ID is required.");
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, onboarded")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    onboarded: data.onboarded === true,
    displayName: null,
    email: null,
    provider: "email",
  };
}

export async function ensureAuthenticatedProfile(user: User): Promise<ProfileIdentity> {
  let profile = await getProfile(user.id);
  if (!profile) {
    const values = initialProfileValues(user);
    const { error } = await supabase
      .from("profiles")
      .upsert(values, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
    profile = await getProfile(user.id);
  }
  if (!profile) throw new Error("Profile could not be ensured.");
  return normalizeProfileIdentity(user, profile as ProfileRecord);
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
