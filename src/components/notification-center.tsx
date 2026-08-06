import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth-context";
import { NotificationService, workspaceQueryKeys } from "@/services";

export function NotificationCenter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = workspaceQueryKeys.notifications(user?.id);
  const query = useQuery({
    queryKey: key,
    queryFn: () => NotificationService.list(),
    enabled: !!user,
    staleTime: 30_000,
  });
  const unread = (query.data ?? []).filter((item) => !item.isRead).length;
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: key });
    await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.dashboard(user?.id) });
  };
  const mark = useMutation({
    mutationFn: (id: string) => NotificationService.markRead(id),
    onSuccess: refresh,
    onError: () => toast.error("Notification could not be updated"),
    retry: false,
  });
  const markAll = useMutation({
    mutationFn: () => NotificationService.markAllRead(),
    onSuccess: refresh,
    onError: () => toast.error("Notifications could not be updated"),
    retry: false,
  });
  const remove = useMutation({
    mutationFn: (id: string) => NotificationService.remove(id),
    onSuccess: refresh,
    onError: () => toast.error("Notification could not be deleted"),
    retry: false,
  });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={`${unread} unread notifications`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-semibold text-black">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b border-border p-3">
          <div>
            <p className="font-medium">Notifications</p>
            <p className="text-xs text-muted-foreground">{unread} unread</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={!unread || markAll.isPending}
          >
            <CheckCheck className="mr-1 h-4 w-4" /> Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {query.isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : query.isError ? (
            <div className="p-6 text-center text-sm text-destructive">
              Notifications could not be loaded.
            </div>
          ) : !query.data?.length ? (
            <div className="p-8 text-center">
              <Bell className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">You're all caught up.</p>
            </div>
          ) : (
            query.data.map((item) => (
              <div
                key={item.id}
                className={`group flex gap-3 border-b border-border p-3 last:border-0 ${item.isRead ? "opacity-70" : "bg-gold/5"}`}
              >
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => !item.isRead && mark.mutate(item.id)}
                >
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  {item.message && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.message}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(item.createdAt))}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100"
                  onClick={() => remove.mutate(item.id)}
                  aria-label="Delete notification"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
