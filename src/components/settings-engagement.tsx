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
import { useLanguage } from "@/providers/language-provider";

const copy = {
  "pt-BR": {
    webPush: "Web Push",
    permissionHelp: "A permissão só é solicitada quando você escolhe Ativar.",
    notificationsEnabled: "Notificações ativadas",
    enableError: "Não foi possível ativar o push",
    enabling: "Ativando…",
    repair: "Reparar inscrição",
    enable: "Ativar notificações",
    subscription: "Inscrição push",
    checking: "verificando…",
    unavailable: "indisponível",
    loadingPreferences: "Carregando preferências…",
    preferencesError: "Não foi possível carregar as preferências de notificações.",
    retry: "Tentar novamente",
    tasks: "Tarefas",
    projects: "Projetos",
    studies: "Estudos",
    agents: "Agents",
    journeys: "Journeys",
    community: "Comunidade",
    integrations: "Integrações",
    approvals: "Aprovações",
    premiumLifecycle: "Premium e assinatura",
    dailySummary: "Resumo diário",
    timezone: "Fuso horário",
    timezoneError: "Informe um fuso IANA válido, por exemplo America/Sao_Paulo.",
    quietFrom: "Silêncio a partir de",
    quietUntil: "Silêncio até",
    testAccepted: "Teste de push aceito para entrega",
    testFailed: "Falha no teste de push",
    sending: "Enviando…",
    sendTest: "Enviar notificação de teste",
    capabilities: "Permissões e recursos do dispositivo",
    notifications: "Notificações",
    microphone: "Microfone",
    speech: "Reconhecimento de fala",
    appContext: "Contexto do app instalado",
    available: "disponível",
    unsupported: "sem suporte",
    standalone: "standalone",
    browser: "navegador",
    testMicrophone: "Testar permissão do microfone",
    microphoneHelp: "O acesso ao microfone só é solicitado por este teste explícito e é encerrado imediatamente.",
    usageHelp: "Requisições medidas pelo backend hoje. Prompts e respostas nunca são armazenados neste registro.",
    loadingUsage: "Carregando uso de hoje…",
    usageError: "Não foi possível carregar o uso do backend.",
    noUsage: "Nenhuma requisição de IA medida foi registrada hoje.",
    requestsToday: "requisições hoje",
    quotaHelp: "Limites e acesso são aplicados pelo backend de IA. Um denominador de cota só é exibido quando o backend expõe sua política ativa.",
  },
  en: {
    webPush: "Web Push",
    permissionHelp: "Permission is requested only when you choose Enable.",
    notificationsEnabled: "Notifications enabled",
    enableError: "Could not enable push",
    enabling: "Enabling…",
    repair: "Repair subscription",
    enable: "Enable notifications",
    subscription: "Push subscription",
    checking: "checking…",
    unavailable: "unavailable",
    loadingPreferences: "Loading preferences…",
    preferencesError: "Notification preferences could not be loaded.",
    retry: "Retry",
    tasks: "Tasks",
    projects: "Projects",
    studies: "Studies",
    agents: "Agents",
    journeys: "Journeys",
    community: "Community",
    integrations: "Integrations",
    approvals: "Approvals",
    premiumLifecycle: "Premium & subscription",
    dailySummary: "Daily summary",
    timezone: "Timezone",
    timezoneError: "Enter a valid IANA timezone, for example America/Sao_Paulo.",
    quietFrom: "Quiet from",
    quietUntil: "Quiet until",
    testAccepted: "Test push accepted for delivery",
    testFailed: "Test push failed",
    sending: "Sending…",
    sendTest: "Send test notification",
    capabilities: "Permissions & device capabilities",
    notifications: "Notifications",
    microphone: "Microphone",
    speech: "Speech recognition",
    appContext: "Installed app context",
    available: "available",
    unsupported: "unsupported",
    standalone: "standalone",
    browser: "browser",
    testMicrophone: "Test microphone permission",
    microphoneHelp: "Microphone access is requested only by this explicit test and is stopped immediately.",
    usageHelp: "Measured backend requests for today. Prompts and responses are never stored in this ledger.",
    loadingUsage: "Loading today's usage…",
    usageError: "Usage could not be loaded from the backend.",
    noUsage: "No metered AI requests recorded today.",
    requestsToday: "requests today",
    quotaHelp: "Limits and access are enforced by the AI backend. A quota denominator is shown only when the backend exposes its active policy.",
  },
} as const;

export function NotificationSettings() {
  const { user } = useAuth();
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
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
            {text.webPush} · <span className="capitalize">{state}</span>
          </p>
          <p className="text-sm text-muted-foreground">{text.permissionHelp}</p>
        </div>
        <Button
          disabled={state === "blocked" || state === "unsupported" || enabling}
          onClick={async () => {
            setEnabling(true);
            setActionError(null);
            try {
              await PushService.enable();
              await subscription.refetch();
              toast.success(text.notificationsEnabled);
            } catch (error) {
              const message = error instanceof Error ? error.message : text.enableError;
              setActionError(message);
              toast.error(message);
            } finally {
              setEnabling(false);
            }
          }}
        >
          <BellRing className="mr-2 h-4 w-4" />
          {enabling ? text.enabling : state === "enabled" ? text.repair : text.enable}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {text.subscription}: {subscription.isLoading ? text.checking : (subscription.data ?? text.unavailable)}
      </p>
      {preferences.isLoading && <p className="text-sm text-muted-foreground">{text.loadingPreferences}</p>}
      {preferences.isError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 p-4 text-sm">
          <span>{text.preferencesError}</span>
          <Button size="sm" variant="outline" onClick={() => void preferences.refetch()}>{text.retry}</Button>
        </div>
      )}
      {actionError && <p role="alert" className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">{actionError}</p>}
      {p && (
        <>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {([
              ["tasks_enabled", text.tasks],
              ["projects_enabled", text.projects],
              ["studies_enabled", text.studies],
              ["agents_enabled", text.agents],
              ["journeys_enabled", text.journeys],
              ["community_enabled", text.community],
              ["integrations_enabled", text.integrations],
              ["approvals_enabled", text.approvals],
              ["premium_enabled", text.premiumLifecycle],
              ["daily_summary_enabled", text.dailySummary],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex min-h-11 items-center justify-between gap-4">
                <Label htmlFor={key}>{label}</Label>
                <Switch
                  id={key}
                  checked={p[key]}
                  disabled={save.isPending}
                  onCheckedChange={(value) => save.mutate({ [key]: value })}
                />
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <Label htmlFor="timezone">{text.timezone}</Label>
              <Input
                id="timezone"
                className="mt-2"
                defaultValue={p.timezone}
                onBlur={(event) => {
                  try {
                    Intl.DateTimeFormat("en-US", { timeZone: event.target.value }).format();
                    save.mutate({ timezone: event.target.value });
                  } catch {
                    setActionError(text.timezoneError);
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="quiet-start">{text.quietFrom}</Label>
              <Input id="quiet-start" type="time" className="mt-2" value={p.quiet_hours_start ?? ""} onChange={(event) => save.mutate({ quiet_hours_start: event.target.value || null })} />
            </div>
            <div>
              <Label htmlFor="quiet-end">{text.quietUntil}</Label>
              <Input id="quiet-end" type="time" className="mt-2" value={p.quiet_hours_end ?? ""} onChange={(event) => save.mutate({ quiet_hours_end: event.target.value || null })} />
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
                toast.success(text.testAccepted);
              } catch (error) {
                setActionError(error instanceof Error ? error.message : text.testFailed);
              } finally {
                setTesting(false);
              }
            }}
          >
            <Send className="mr-2 h-4 w-4" /> {testing ? text.sending : text.sendTest}
          </Button>
        </>
      )}
      <PermissionsCenter />
    </div>
  );
}

function PermissionsCenter() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const [microphone, setMicrophone] = useState<"prompt" | "granted" | "denied" | "unsupported">("prompt");
  const speechSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const standalone = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;

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
      <p className="font-medium">{text.capabilities}</p>
      <Capability label={text.notifications} value={PushService.support()} />
      <Capability label={text.microphone} value={microphone} />
      <Capability label={text.speech} value={speechSupported ? text.available : text.unsupported} />
      <Capability label={text.appContext} value={standalone ? text.standalone : text.browser} />
      <Button size="sm" variant="outline" onClick={() => void checkMicrophone()}>
        <Mic className="mr-2 h-4 w-4" /> {text.testMicrophone}
      </Button>
      <p className="text-xs text-muted-foreground">{text.microphoneHelp}</p>
    </div>
  );
}

function Capability({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 text-sm"><span>{label}</span><span className="capitalize text-muted-foreground">{value}</span></div>;
}

export function UsageSettings() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const usage = useQuery({ queryKey: ["ai-usage", "today"], queryFn: UsageService.today });
  const entries = Object.entries((usage.data ?? {}) as Record<string, number>).filter(([, count]) => count > 0);
  return (
    <div className="space-y-5">
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><BrainCircuit className="h-4 w-4" />{text.usageHelp}</p>
      {usage.isLoading ? (
        <p className="text-sm text-muted-foreground" role="status">{text.loadingUsage}</p>
      ) : usage.isError ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 p-4 text-sm"><span>{text.usageError}</span><Button size="sm" variant="outline" onClick={() => void usage.refetch()}>{text.retry}</Button></div>
      ) : entries.length === 0 ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">{text.noUsage}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map(([action, used]) => (
            <div key={action} className="rounded-xl border p-4">
              <p className="text-sm capitalize text-muted-foreground">{action.replaceAll("_", " ")}</p>
              <p className="mt-1 text-2xl font-semibold">{used}</p>
              <p className="text-xs text-muted-foreground">{text.requestsToday}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs leading-5 text-muted-foreground">{text.quotaHelp}</p>
    </div>
  );
}
