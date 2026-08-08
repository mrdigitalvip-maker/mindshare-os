import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, BrainCircuit } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PushService, type NotificationPreferences } from "@/services/push-service";
import { UsageService } from "@/services/studio-service";
export function NotificationSettings() {
  const client = useQueryClient();
  const preferences = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => PushService.preferences(),
  });
  const save = useMutation({
    mutationFn: (patch: Partial<NotificationPreferences>) => PushService.save(patch),
    onSuccess: () => client.invalidateQueries({ queryKey: ["notification-preferences"] }),
  });
  const state = PushService.support();
  const p = preferences.data;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
        <div>
          <p className="font-medium">
            Web Push · <span className="capitalize">{state}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Permission is requested only when you choose Enable.
          </p>
        </div>
        <Button
          disabled={state === "blocked" || state === "unsupported" || state === "enabled"}
          onClick={async () => {
            try {
              await PushService.enable();
              toast.success("Notifications enabled");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not enable push");
            }
          }}
        >
          <BellRing className="mr-2 h-4 w-4" />
          Enable notifications
        </Button>
      </div>
      {p && (
        <>
          {(
            [
              ["tasks_enabled", "Tasks"],
              ["projects_enabled", "Projects"],
              ["studies_enabled", "Studies"],
              ["studio_enabled", "Studio"],
              ["daily_summary_enabled", "Daily Summary"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex min-h-11 items-center justify-between">
              <Label htmlFor={key}>{label}</Label>
              <Switch
                id={key}
                checked={p[key]}
                onCheckedChange={(value) => save.mutate({ [key]: value })}
              />
            </div>
          ))}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                className="mt-2"
                value={p.timezone}
                onChange={(event) => save.mutate({ timezone: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="quiet-start">Quiet from</Label>
              <Input
                id="quiet-start"
                type="time"
                className="mt-2"
                value={p.quiet_hours_start ?? ""}
                onChange={(event) => save.mutate({ quiet_hours_start: event.target.value || null })}
              />
            </div>
            <div>
              <Label htmlFor="quiet-end">Quiet until</Label>
              <Input
                id="quiet-end"
                type="time"
                className="mt-2"
                value={p.quiet_hours_end ?? ""}
                onChange={(event) => save.mutate({ quiet_hours_end: event.target.value || null })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
export function UsageSettings() {
  const usage = useQuery({ queryKey: ["ai-usage", "today"], queryFn: UsageService.today });
  const entries = Object.entries((usage.data ?? {}) as Record<string, number>).filter(
    ([, count]) => count > 0,
  );
  return (
    <div className="space-y-5">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <BrainCircuit className="h-4 w-4" />
        Measured backend requests for today. Prompts and responses are never stored in this ledger.
      </p>
      {usage.isLoading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading today's usage…
        </p>
      ) : usage.isError ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 p-4 text-sm">
          <span>Usage could not be loaded from the backend.</span>
          <Button size="sm" variant="outline" onClick={() => void usage.refetch()}>
            Retry
          </Button>
        </div>
      ) : entries.length === 0 ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">
          No metered AI requests recorded today.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map(([action, used]) => (
            <div key={action} className="rounded-xl border p-4">
              <p className="text-sm capitalize text-muted-foreground">
                {action.replaceAll("_", " ")}
              </p>
              <p className="mt-1 text-2xl font-semibold">{used}</p>
              <p className="text-xs text-muted-foreground">requests today</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        Limits and access are enforced by the AI backend. A quota denominator is shown only when the
        backend exposes its active policy.
      </p>
    </div>
  );
}
