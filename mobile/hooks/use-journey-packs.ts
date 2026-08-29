import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, verifiedExecutionInvalidations } from "@/lib/query-keys";
import * as service from "@/services/journey-pack-service";

export const useJourneyPacks = () =>
  useQuery({ queryKey: queryKeys.journeyPacks, queryFn: service.listJourneyPacks });
export const useJourneyPack = (slug: string) =>
  useQuery({
    queryKey: queryKeys.journeyPack(slug),
    queryFn: () => service.getJourneyPack(slug),
    enabled: Boolean(slug),
  });
export function useStartJourneyPack() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: service.startJourneyPack,
    onSuccess: () =>
      Promise.all(
        verifiedExecutionInvalidations.map((queryKey) => client.invalidateQueries({ queryKey })),
      ),
  });
}
