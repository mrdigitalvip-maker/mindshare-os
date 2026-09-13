import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  initialProfileValues,
  normalizeProfileIdentity,
  type ProfileIdentity,
  type ProfileRecord,
} from "@/lib/profile-identity";

export type MobileProfile = ProfileIdentity;
export const PROFILE_READ_TIMEOUT_MS = 6_000;
export const PROFILE_BOOTSTRAP_TIMEOUT_MS = 8_000;

function withTimeout<T>(operation: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Account provisioning timed out.")), timeoutMs);
    Promise.resolve(operation).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

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
  // Normal sign-ups already create a profile through the auth trigger. Read first so
  // returning users never wait on the repair/bootstrap RPC during every app launch.
  const existingProfile = await withTimeout(getProfile(user.id), PROFILE_READ_TIMEOUT_MS);
  if (existingProfile) return normalizeProfileIdentity(user, existingProfile as ProfileRecord);

  // Repair path only: older/partial accounts that do not have a profile yet.
  const values = initialProfileValues(user);
  const { error } = await withTimeout(
    supabase.rpc("bootstrap_authenticated_user", {
      p_full_name: values.full_name,
      p_avatar_url: values.avatar_url,
    }),
    PROFILE_BOOTSTRAP_TIMEOUT_MS,
  );
  if (error) throw error;

  const repairedProfile = await withTimeout(getProfile(user.id), PROFILE_READ_TIMEOUT_MS);
  if (!repairedProfile) throw new Error("Profile could not be ensured.");
  return normalizeProfileIdentity(user, repairedProfile as ProfileRecord);
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
