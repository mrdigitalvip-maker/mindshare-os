import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChallengePeriod, CreatePersonalChallengeInput } from "@/lib/arena";
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

export function usePersonalChallenges() {
  const id = useAuth().session?.user.id ?? "";
  return useQuery({
    queryKey: queryKeys.personalChallenges,
    queryFn: () => service.listPersonalChallenges(id),
    enabled: Boolean(id),
  });
}

export function useChallengeSuggestions() {
  const id = useAuth().session?.user.id ?? "";
  return useQuery({
    queryKey: queryKeys.challengeSuggestions,
    queryFn: () => service.listChallengeSuggestions(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePersonalChallenge() {
  const id = useAuth().session?.user.id ?? "";
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePersonalChallengeInput) => service.createPersonalChallenge(id, input),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.personalChallenges }),
        client.invalidateQueries({ queryKey: queryKeys.momentum }),
        client.invalidateQueries({ queryKey: queryKeys.arena }),
        client.invalidateQueries({ queryKey: queryKeys.challengeRankingRoot }),
      ]);
    },
  });
}

export function useCheckInPersonalChallenge() {
  const id = useAuth().session?.user.id ?? "";
  const client = useQueryClient();
  return useMutation({
    mutationFn: (challengeId: string) => service.checkInPersonalChallenge(id, challengeId),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.personalChallenges }),
        client.invalidateQueries({ queryKey: queryKeys.momentum }),
        client.invalidateQueries({ queryKey: queryKeys.challengeRankingRoot }),
      ]);
    },
  });
}

export function useAbandonPersonalChallenge() {
  const id = useAuth().session?.user.id ?? "";
  const client = useQueryClient();
  return useMutation({
    mutationFn: (challengeId: string) => service.abandonPersonalChallenge(id, challengeId),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.personalChallenges }),
  });
}

export function useChallengeRanking(period: ChallengePeriod) {
  const id = useAuth().session?.user.id ?? "";
  return useQuery({
    queryKey: queryKeys.challengeRanking(period),
    queryFn: () => service.getChallengeRanking(id, period),
    enabled: Boolean(id),
  });
}

export function useSetChallengeRankingOptIn(period: ChallengePeriod) {
  const id = useAuth().session?.user.id ?? "";
  const client = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => service.setChallengeRankingOptIn(id, enabled),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.challengeRankingRoot }),
        client.invalidateQueries({ queryKey: queryKeys.community }),
      ]);
    },
  });
}
