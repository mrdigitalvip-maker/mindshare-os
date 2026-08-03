import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { withDemoFallback } from "@/lib/demo/fallback";
import { demoProfile } from "@/lib/demo/demo-data";


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
  email_notifications: boolean |null;
  push_notifications: boolean | null;
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<
  Pick<
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

function profileQueryKey(userId?: string) {
  return ["profile", userId] as const;
}

function buildDemoProfile(userId?: string, name?: string, email?: string): Profile {
  return {
    ...demoProfile,
    id: userId ?? demoProfile.id,
    full_name: name ?? demoProfile.full_name,
    username: email?.split("@")[0] ?? demoProfile.username,
  } as Profile;
}

export function useProfile() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: profileQueryKey(user?.id),
    enabled: isAuthenticated && !!user,
    staleTime: 60000,
    queryFn: async (): Promise<Profile | null> =>
      withDemoFallback(
        async () => {
          if (!user) return null;

          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (error) throw error;

          // A missing profile row would leave the shell stuck on its loader —
          // serve a coherent placeholder instead.
          return (data as Profile | null) ?? buildDemoProfile(user.id, user.name, user.email);
        },
        () => buildDemoProfile(user?.id, user?.name, user?.email),
        "profile",
      ),
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: ProfileUpdate): Promise<Profile> => {
      const current =
        queryClient.getQueryData<Profile>(profileQueryKey(user?.id)) ??
        buildDemoProfile(user?.id, user?.name, user?.email);
      const optimistic: Profile = {
        ...current,
        ...patch,
        updated_at: new Date().toISOString(),
      } as Profile;

      return withDemoFallback(
        async () => {
          if (!user) {
            throw new Error("You must be signed in to update your profile.");
          }

          const { data, error } = await supabase
            .from("profiles")
            .update(patch)
            .eq("id", user.id)
            .select("*")
            .single();

          if (error) throw error;

          return data as Profile;
        },
        optimistic,
        "profile update",
      );
    },

    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey(user?.id), profile);
    },
  });
}


export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  return withDemoFallback(
    async () => {
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: true,
          cacheControl: "3600",
        });

      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);

      return data.publicUrl;
    },
    // Local preview URL keeps the avatar flow usable without Storage.
    () => (typeof URL !== "undefined" ? URL.createObjectURL(file) : ""),
    "avatar upload",
  );
}

