import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, BrainCircuit, Mic, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PushService, type NotificationPreferences } from "@/services/push-service";
import { UsageService } from "@/services/studio-service";
import { useAuth } from "@/lib/auth-context";
export function NotificationSettings() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [enabling, setEnabling] = useState(false);
  const [testing, setTesting] = useState(false);
  const preferences = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: () => PushService.preferences(),
    enabled: !!user?.id,
  });
  const subscription = useQuery({
    queryKey: ["push-subscription", user?.id],
    queryFn: () => PushService.subscriptionState(),
    enabled: !!user?.id,
  });
  const save = useMutation({
    mutationFn: (patch: Partial<NotificationPreferences>) => PushService.save(patch),
    onSuccess: () => {
      setActionError(null);
      void client.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
    },
    onError: (error: Error) => setActionError(error.message),
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
          disabled={state === "blocked" || state === "unsupported" || enabling}
          onClick={async () => {
            setEnabling(true);
            setActionError(null);
            try {
              await PushService.enable();
              await subscription.refetch();
              toast.success("Notifications enabled");
            } catch (error) {
              const message = error instanceof Error ? error.message : "Could not enable push";
              setActionError(message);
              toast.error(message);
            } finally {
              setEnabling(false);
            }
          }}
        >
          <BellRing className="mr-2 h-4 w-4" />
          {enabling
            ? "Enabling…"
            : state === "enabled"
              ? "Repair subscription"
              : "Enable notifications"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Push subscription:{" "}
        {subscription.isLoading ? "checking…" : (subscription.data ?? "unavailable")}
      </p>
      {preferences.isLoading && (
        <p className="text-sm text-muted-foreground">Loading preferences…</p>
      )}
      {preferences.isError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 p-4 text-sm">
          <span>Notification preferences could not be loaded.</span>
          <Button size="sm" variant="outline" onClick={() => void preferences.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive"
        >
          {actionError}
        </p>
      )}
      {p && (
        <>
          {(
            [
              ["tasks_enabled", "Tasks"],
              ["projects_enabled", "Projects"],
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
                defaultValue={p.timezone}
                onBlur={(event) => {
                  try {
                    Intl.DateTimeFormat("en-US", { timeZone: event.target.value }).format();
                    save.mutate({ timezone: event.target.value });
                  } catch {
                    setActionError("Enter a valid IANA timezone, for example America/Sao_Paulo.");
                  }
                }}
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
          <Button
            variant="outline"
            disabled={state !== "enabled" || subscription.data !== "subscribed" || testing}
            onClick={async () => {
              setTesting(true);
              setActionError(null);
              try {
                await PushService.sendTest();
                toast.success("Test push accepted for delivery");
              } catch (error) {
                setActionError(error instanceof Error ? error.message : "Test push failed");
              } finally {
                setTesting(false);
              }
            }}
          >
            <Send className="mr-2 h-4 w-4" /> {testing ? "Sending…" : "Send test notification"}
          </Button>
        </>
      )}
      <PermissionsCenter />
    </div>
  );
}

function PermissionsCenter() {
  const [microphone, setMicrophone] = useState<"prompt" | "granted" | "denied" | "unsupported">(
    "prompt",
  );
  const speechSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const standalone =
    typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;

  async function checkMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) return setMicrophone("unsupported");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophone("granted");
    } catch (error) {
      setMicrophone((error as DOMException).name === "NotAllowedError" ? "denied" : "unsupported");
    }
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="font-medium">Permissions & device capabilities</p>
      <Capability label="Notifications" value={PushService.support()} />
      <Capability label="Microphone" value={microphone} />
      <Capability
        label="Speech recognition"
        value={speechSupported ? "available" : "unsupported"}
      />
      <Capability label="Installed app context" value={standalone ? "standalone" : "browser"} />
      <Button size="sm" variant="outline" onClick={() => void checkMicrophone()}>
        <Mic className="mr-2 h-4 w-4" /> Test microphone permission
      </Button>
      <p className="text-xs text-muted-foreground">
        Microphone access is requested only by this explicit test and is stopped immediately.
      </p>
    </div>
  );
}

function Capability({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span>{label}</span>
      <span className="capitalize text-muted-foreground">{value}</span>
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
