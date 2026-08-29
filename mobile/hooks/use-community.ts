import { useEffect } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
export function useOfficialChannels() {
  const id = useUserId();
  return useQuery({
    queryKey: queryKeys.communityChannels,
    queryFn: () => service.getOfficialChannels(id),
    enabled: Boolean(id),
  });
}
export function useOfficialChannelActions() {
  const id = useUserId(),
    c = useQueryClient(),
    done = () => c.invalidateQueries({ queryKey: queryKeys.communityChannels });
  return {
    join: useMutation({
      mutationFn: (channel: string) => service.joinOfficialChannel(id, channel),
      onSuccess: done,
    }),
    leave: useMutation({
      mutationFn: (channel: string) => service.leaveOfficialChannel(id, channel),
      onSuccess: done,
    }),
    notifications: useMutation({
      mutationFn: (p: {
        channel: string;
        mode: Parameters<typeof service.setNotificationMode>[2];
      }) => service.setNotificationMode(id, p.channel, p.mode),
      onSuccess: done,
    }),
  };
}
export function useCommunityMessages(channelId: string) {
  const id = useUserId(),
    client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: queryKeys.communityMessages(channelId),
    queryFn: ({ pageParam }) => service.getMessages(id, channelId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => (page.length === 30 ? page[0]?.createdAt : undefined),
    enabled: Boolean(id && channelId),
  });
  useEffect(() => {
    if (!id || !channelId) return;
    return service.subscribeToChannel(
      channelId,
      () => void client.invalidateQueries({ queryKey: queryKeys.communityMessages(channelId) }),
    );
  }, [channelId, client, id]);
  return query;
}
export function useMessageActions(channelId: string) {
  const id = useUserId(),
    c = useQueryClient(),
    done = () => c.invalidateQueries({ queryKey: queryKeys.communityMessages(channelId) });
  return {
    send: useMutation({
      mutationFn: (p: { body: string; requestId: string }) =>
        service.sendMessage(id, channelId, p.body, p.requestId),
      onSuccess: done,
    }),
    react: useMutation({
      mutationFn: (p: { id: string; reaction: Parameters<typeof service.reactToMessage>[2] }) =>
        service.reactToMessage(id, p.id, p.reaction),
      onSuccess: done,
    }),
    report: useMutation({ mutationFn: (message: string) => service.reportMessage(id, message) }),
    block: useMutation({
      mutationFn: (message: string) => service.blockMessageSender(id, message),
      onSuccess: done,
    }),
  };
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
