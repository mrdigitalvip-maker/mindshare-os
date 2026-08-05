import { demoProfile } from "@/lib/demo/demo-data";
import { withDemoFallback } from "@/lib/demo/fallback";
import { supabase } from "@/lib/supabase";

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

export function buildDemoProfile(userId?: string, name?: string, email?: string): Profile {
  return {
    ...demoProfile,
    id: userId ?? demoProfile.id,
    full_name: name ?? demoProfile.full_name,
    username: email?.split("@")[0] ?? demoProfile.username,
  } as Profile;
}

export const ProfileService = {
  async get(user?: { id: string; name?: string; email: string }): Promise<Profile | null> {
    return withDemoFallback(
      async () => {
        if (!user) return null;
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;
        return data as Profile | null;
      },
      () => buildDemoProfile(user?.id, user?.name, user?.email),
      "profile",
    );
  },
  async update(userId: string, patch: ProfileUpdate, fallback: Profile): Promise<Profile> {
    return withDemoFallback(
      async () => {
        const { data, error } = await supabase
          .from("profiles")
          .update(patch)
          .eq("id", userId)
          .select("*")
          .single();
        if (error) throw error;
        return data as Profile;
      },
      fallback,
      "profile update",
    );
  },
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    return withDemoFallback(
      async () => {
        const { error } = await supabase.storage
          .from("avatars")
          .upload(path, file, { upsert: true, cacheControl: "3600" });
        if (error) throw error;
        return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      },
      () => (typeof URL !== "undefined" ? URL.createObjectURL(file) : ""),
      "avatar upload",
    );
  },
};
