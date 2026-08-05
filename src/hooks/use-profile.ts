import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  ProfileService,
  buildDemoProfile,
  type Profile,
  type ProfileUpdate,
} from "@/services/profile-service";

export type { Profile, ProfileUpdate } from "@/services/profile-service";
const profileQueryKey = (userId?: string) => ["profile", userId] as const;

export function useProfile() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: profileQueryKey(user?.id),
    enabled: isAuthenticated && !!user,
    staleTime: 60_000,
    queryFn: () => ProfileService.get(user ?? undefined),
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProfileUpdate): Promise<Profile> => {
      if (!user) throw new Error("You must be signed in to update your profile.");
      const current =
        queryClient.getQueryData<Profile>(profileQueryKey(user.id)) ??
        buildDemoProfile(user.id, user.name, user.email);
      const optimistic = { ...current, ...patch, updated_at: new Date().toISOString() } as Profile;
      return ProfileService.update(user.id, patch, optimistic);
    },
    onSuccess: (profile) => queryClient.setQueryData(profileQueryKey(user?.id), profile),
  });
}

export const uploadAvatar = ProfileService.uploadAvatar;
