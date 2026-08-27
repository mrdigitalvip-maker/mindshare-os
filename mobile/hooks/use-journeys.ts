import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
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
  const uid = useUid();
  return useQuery({
    queryKey: queryKeys.journey(id),
    queryFn: () => service.getJourney(uid, id),
    enabled: Boolean(uid && id),
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
      [
        queryKeys.journeys,
        queryKeys.dailyMission,
        queryKeys.momentum,
        queryKeys.journeyChallenge,
      ].map((queryKey) => client.invalidateQueries({ queryKey })),
    );
  const create = useMutation({
    mutationFn: (input: Parameters<typeof service.createJourney>[1]) =>
      service.createJourney(id, input),
    onSuccess: refresh,
  });
  const status = useMutation({
    mutationFn: (input: { id: string; status: Parameters<typeof service.setJourneyStatus>[2] }) =>
      service.setJourneyStatus(id, input.id, input.status),
    onSuccess: refresh,
  });
  const completeMission = useMutation({
    mutationFn: (missionId: string) => service.completeJourneyAction(id, missionId),
    onSuccess: refresh,
  });
  return { create, status, completeMission };
}
