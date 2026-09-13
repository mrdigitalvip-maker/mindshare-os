import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { loadPassportHomeSnapshot } from "@/services/passport-home-service";
import {
  listPassportLanguageTracks,
  upsertPassportProfile,
  type UpsertPassportProfileInput,
} from "@/services/passport-service";

export function usePassportLanguageTracks() {
  return useQuery({
    queryKey: ["passport", "tracks"] as const,
    queryFn: listPassportLanguageTracks,
    staleTime: 5 * 60_000,
  });
}

export function usePassportHome(missionDate: string) {
  const userId = useAuth().session?.user.id ?? "";
  const date = missionDate.trim();

  return useQuery({
    queryKey: ["passport", "home", userId, date] as const,
    queryFn: () => loadPassportHomeSnapshot(userId, date),
    enabled: Boolean(userId) && /^\d{4}-\d{2}-\d{2}$/.test(date),
    staleTime: 60_000,
  });
}

export function useUpsertPassportProfile() {
  const userId = useAuth().session?.user.id ?? "";
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertPassportProfileInput) => upsertPassportProfile(userId, input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["passport"] });
    },
  });
}
