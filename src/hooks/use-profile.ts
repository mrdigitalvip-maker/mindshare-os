import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

/**
 * Shape of `public.profiles`, defined manually because
 * `src/integrations/supabase/types.ts` does not yet contain generated
 * types. Includes `country`, `primary_goal` and `preferences`, which
 * require the migration documented alongside the onboarding step.
 * Replace with `Database["public"]["Tables"]["profiles"]["Row"]` once
 * types are regenerated.
 */
export interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  language: string | null;
  country: string | null;
  timezone: string | null;
  primary_goal: string | null;
  preferences: Record<string, unknown>;
  plan: string | null;
  onboarded: boolean | null;
  email_notifications: boolean | null;
  push_notifications: boolean | null;
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial
  Pick
    Profile,
    | "full_name"
    | "avatar_url"
    | "language"
    | "country"
    | "timezone"
    | "primary_goal"
    | "preferences"
    | "onboarded"
  >
>;

function profileQueryKey(userId: string | undefined) {
  return ["profile", userId] as const;
}

/**
 * Reads the current user's row from `public.profiles`. Returns `null`
 * while unauthenticated or before the row exists.
 */
export function useProfile() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: profileQueryKey(user?.id),
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: isAuthenticated && !!user,
    staleTime: 60_000,
  });
}

/**
 * Updates the current user's `profiles` row and syncs the TanStack Query
 * cache so every consumer of `useProfile` re-renders with fresh data
 * without an extra round trip.
 */
export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: ProfileUpdate): Promise<Profile> => {
      if (!user) throw new Error("You must be signed in to update your profile.");
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(profileQueryKey(user?.id), data);
    },
  });
}

/**
 * Uploads an avatar image to the `avatars` Storage bucket and returns its
 * public URL. Assumes the bucket exists and is public — confirm bucket
 * visibility/RLS in Supabase Storage before relying on this in production.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
