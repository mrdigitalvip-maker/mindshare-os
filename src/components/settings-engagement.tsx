import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, BrainCircuit } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { PushService, type NotificationPreferences } from "@/services/push-service";
import { UsageService } from "@/services/studio-service";
import { useSubscription } from "@/hooks/use-subscription";
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
const limits = {
  free: {
    assistant: 10,
    translation: 5,
    content_generation: 2,
    study_assistance: 5,
    studio_coach: 3,
  },
  premium: {
    assistant: 100,
    translation: 100,
    content_generation: 50,
    study_assistance: 50,
    studio_coach: 30,
  },
};
export function UsageSettings() {
  const usage = useQuery({ queryKey: ["ai-usage", "today"], queryFn: UsageService.today });
  const subscription = useSubscription();
  const policy = limits[subscription.data?.isPremium ? "premium" : "free"];
  return (
    <div className="space-y-5">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <BrainCircuit className="h-4 w-4" />
        Measured backend requests for today. Prompts and responses are never stored in this ledger.
      </p>
      {Object.entries(policy).map(([action, limit]) => {
        const used = usage.data?.[action] ?? 0;
        return (
          <div key={action}>
            <div className="mb-2 flex justify-between text-sm">
              <span className="capitalize">{action.replaceAll("_", " ")}</span>
              <span>
                {used} / {limit} today
              </span>
            </div>
            <Progress
              value={Math.min(100, (used / limit) * 100)}
              aria-label={`${action}: ${used} of ${limit} requests used`}
            />
          </div>
        );
      })}
    </div>
  );
}
