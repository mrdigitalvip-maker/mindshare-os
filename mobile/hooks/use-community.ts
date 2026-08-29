import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { queryKeys } from "@/lib/query-keys";
import * as service from "@/services/community-service";
const useUserId = () => useAuth().session?.user.id ?? "";
export function useCommunity() {
  const id = useUserId();
  return useQuery({
    queryKey: queryKeys.community,
    queryFn: () => service.getCommunityHome(id),
    enabled: Boolean(id),
  });
}
export function useSquad(id: string) {
  const uid = useUserId();
  return useQuery({
    queryKey: queryKeys.squad(id),
    queryFn: () => service.getSquad(uid, id),
    enabled: Boolean(uid && id),
  });
}
const invalidate = (client: ReturnType<typeof useQueryClient>) =>
  client.invalidateQueries({ queryKey: queryKeys.community });
export function useSaveCommunityProfile() {
  const id = useUserId(),
    c = useQueryClient();
  return useMutation({
    mutationFn: (p: Parameters<typeof service.saveProfile>[1]) => service.saveProfile(id, p),
    onSuccess: () => invalidate(c),
  });
}
export function useCreateSquad() {
  const id = useUserId(),
    c = useQueryClient();
  return useMutation({
    mutationFn: (p: { name: string; description: string }) =>
      service.createSquad(id, p.name, p.description),
    onSuccess: () => invalidate(c),
  });
}
export function useAcceptInvite() {
  const id = useUserId(),
    c = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => service.acceptInvite(id, code),
    onSuccess: () => invalidate(c),
  });
}
export function useReact() {
  const id = useUserId(),
    c = useQueryClient();
  return useMutation({
    mutationFn: (p: { activityId: string; reaction: Parameters<typeof service.react>[2] }) =>
      service.react(id, p.activityId, p.reaction),
    onSuccess: () => invalidate(c),
  });
}
export function useSquadActions(squadId: string) {
  const id = useUserId(),
    c = useQueryClient();
  const done = async () => {
    await Promise.all([invalidate(c), c.invalidateQueries({ queryKey: queryKeys.squad(squadId) })]);
  };
  return {
    invite: useMutation({ mutationFn: () => service.createInvite(id, squadId) }),
    leave: useMutation({ mutationFn: () => service.leaveSquad(id, squadId), onSuccess: done }),
    remove: useMutation({
      mutationFn: (member: string) => service.removeMember(id, squadId, member),
      onSuccess: done,
    }),
    deleteSquad: useMutation({
      mutationFn: () => service.deleteSquad(id, squadId),
      onSuccess: done,
    }),
    block: useMutation({
      mutationFn: (member: string) => service.blockUser(id, member),
      onSuccess: done,
    }),
    reportMember: useMutation({
      mutationFn: (member: string) => service.reportTarget(id, "profile", member, "other"),
    }),
    reportSquad: useMutation({
      mutationFn: () => service.reportTarget(id, "squad", squadId, "other"),
    }),
  };
}
