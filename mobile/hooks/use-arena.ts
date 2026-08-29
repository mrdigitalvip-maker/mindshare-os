import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import * as service from "@/services/arena-service";

export function useArena() {
  const id = useAuth().session?.user.id ?? "";
  return useQuery({
    queryKey: queryKeys.arena,
    queryFn: () => service.listArenaChallenges(id),
    enabled: Boolean(id),
  });
}

export function useJoinArenaChallenge() {
  const id = useAuth().session?.user.id ?? "";
  const client = useQueryClient();
  return useMutation({
    mutationFn: (challengeId: string) => service.joinArenaChallenge(id, challengeId),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.arena }),
        client.invalidateQueries({ queryKey: queryKeys.journeyChallenge }),
        client.invalidateQueries({ queryKey: queryKeys.momentum }),
      ]);
    },
  });
}
