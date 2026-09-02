import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, verifiedExecutionInvalidations } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import * as service from "@/services/journey-service";
const useUid = () => useAuth().session?.user.id ?? "";
export function useJourneys() {
  const id = useUid();
  return useQuery({
    queryKey: queryKeys.journeys,
    queryFn: () => service.listJourneys(id),
    enabled: Boolean(id),
  });
}
export function useJourney(id: string) {
  const uid = useUid(),
    normalizedId = id.trim();
  return useQuery({
    queryKey: normalizedId ? queryKeys.journey(normalizedId) : ["journeys", "missing-id"],
    queryFn: () => service.getJourney(uid, normalizedId),
    enabled: Boolean(uid && normalizedId),
  });
}
export function useJourneyProgram(id: string, sourcePackId?: string | null) {
  const uid = useUid(),
    normalizedId = id.trim();
  return useQuery({
    queryKey: normalizedId
      ? queryKeys.journeyProgram(normalizedId)
      : ["journeys", "missing-program"],
    queryFn: () => service.getJourneyProgram(uid, normalizedId),
    enabled: Boolean(uid && normalizedId && sourcePackId),
  });
}
export function useDailyMission() {
  const id = useUid();
  return useQuery({
    queryKey: queryKeys.dailyMission,
    queryFn: () => service.ensureDailyMission(id),
    enabled: Boolean(id),
  });
}
export function useMomentum() {
  const id = useUid();
  return useQuery({
    queryKey: queryKeys.momentum,
    queryFn: () => service.getMomentum(id),
    enabled: Boolean(id),
  });
}
export function useJourneyChallenge() {
  const id = useUid();
  return useQuery({
    queryKey: queryKeys.journeyChallenge,
    queryFn: () => service.getWeeklyChallenge(id),
    enabled: Boolean(id),
  });
}
export function useJourneyMutations() {
  const id = useUid(),
    client = useQueryClient();
  const refresh = () =>
    Promise.all(
      verifiedExecutionInvalidations.map((queryKey) => client.invalidateQueries({ queryKey })),
    );
  const create = useMutation({
    mutationFn: (input: Parameters<typeof service.createJourney>[1]) =>
      service.createJourney(id, input),
    onSuccess: refresh,
  });
  const status = useMutation({
    mutationFn: (input: { id: string; status: Parameters<typeof service.setJourneyStatus>[2] }) =>
      service.setJourneyStatus(id, input.id, input.status),
    onSuccess: async (_, input) => {
      await client.invalidateQueries({ queryKey: queryKeys.journey(input.id) });
      await refresh();
    },
  });
  const completeMission = useMutation({
    mutationFn: (missionId: string) => service.completeJourneyAction(id, missionId),
    onSuccess: async (completed) => {
      if (completed.journeyId) {
        await Promise.all([
          client.invalidateQueries({ queryKey: queryKeys.journey(completed.journeyId) }),
          client.invalidateQueries({ queryKey: queryKeys.journeyProgram(completed.journeyId) }),
        ]);
      }
      await client.invalidateQueries({ queryKey: queryKeys.dailyMission });
      await refresh();
    },
  });
  return { create, status, completeMission };
}
