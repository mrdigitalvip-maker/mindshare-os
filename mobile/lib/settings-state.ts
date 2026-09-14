import type { Entitlement } from "@/lib/subscription";

export type NotificationReadiness =
  | "active"
  | "needs-registration"
  | "channel-error"
  | "project-config"
  | "denied"
  | "blocked"
  | "undetermined"
  | "unsupported";

export type SettingsLocale = "pt-BR" | "en";

type NotificationCopy = Record<
  NotificationReadiness,
  { title: string; description: string; action?: string }
>;

export function notificationReadiness(
  permission: "granted" | "denied" | "blocked" | "undetermined" | "unsupported",
  registered: boolean,
  channelReady = true,
  projectConfigAvailable = true,
): NotificationReadiness {
  if (permission === "granted") {
    if (!channelReady) return "channel-error";
    if (!projectConfigAvailable) return "project-config";
    return registered ? "active" : "needs-registration";
  }
  return permission;
}

export const notificationCopy: NotificationCopy = {
  active: {
    title: "Notificações prontas neste dispositivo",
    description:
      "Permissão, canal Android, projeto Expo/EAS e registro remoto estão prontos. A entrega final será confirmada no teste físico.",
  },
  "needs-registration": {
    title: "Permissão ativa",
    description: "A permissão está ativa, mas este aparelho ainda precisa ser registrado.",
    action: "Concluir ativação",
  },
  "channel-error": {
    title: "Canal de notificações indisponível",
    description: "Não foi possível preparar as notificações neste aparelho.",
    action: "Tentar novamente",
  },
  "project-config": {
    title: "Push remoto indisponível",
    description: "A configuração Expo/EAS necessária para push remoto não foi encontrada nesta instalação.",
  },
  denied: {
    title: "Permissão não concedida",
    description: "O Android ainda permite solicitar a permissão novamente.",
    action: "Tentar novamente",
  },
  blocked: {
    title: "Bloqueadas pelo Android",
    description: "Autorize as notificações nas configurações do aparelho.",
    action: "Abrir configurações do Android",
  },
  undetermined: {
    title: "Ainda não ativadas",
    description: "Ative para receber lembretes e atualizações importantes.",
    action: "Ativar notificações",
  },
  unsupported: {
    title: "Indisponíveis neste dispositivo",
    description: "Este dispositivo não oferece suporte a notificações nativas.",
  },
};

export const notificationCopyEn: NotificationCopy = {
  active: {
    title: "Notifications ready on this device",
    description:
      "Permission, Android channel, Expo/EAS project and remote registration are ready. Final delivery will be confirmed during the physical test.",
  },
  "needs-registration": {
    title: "Permission enabled",
    description: "Permission is enabled, but this device still needs to be registered.",
    action: "Complete activation",
  },
  "channel-error": {
    title: "Notification channel unavailable",
    description: "KIVRYN couldn't prepare notifications on this device.",
    action: "Try again",
  },
  "project-config": {
    title: "Remote push unavailable",
    description: "The Expo/EAS configuration required for remote push was not found in this installation.",
  },
  denied: {
    title: "Permission not granted",
    description: "Android still allows KIVRYN to request permission again.",
    action: "Try again",
  },
  blocked: {
    title: "Blocked by Android",
    description: "Allow notifications in your device settings.",
    action: "Open Android settings",
  },
  undetermined: {
    title: "Not enabled yet",
    description: "Enable notifications to receive reminders and important updates.",
    action: "Enable notifications",
  },
  unsupported: {
    title: "Unavailable on this device",
    description: "This device does not support native notifications.",
  },
};

export function notificationCopyFor(locale: SettingsLocale): NotificationCopy {
  return locale === "en" ? notificationCopyEn : notificationCopy;
}

export function subscriptionPlanLabel(
  entitlement?: Entitlement,
  locale: SettingsLocale = "pt-BR",
): "Gratuito" | "Free" | "Premium" {
  if (entitlement === "active" || entitlement === "trialing") return "Premium";
  return locale === "en" ? "Free" : "Gratuito";
}

export function validateProfileName(value: string, locale: SettingsLocale = "pt-BR"): string | null {
  const name = value.trim();
  if (name.length < 2)
    return locale === "en"
      ? "Enter a name with at least 2 characters."
      : "Informe um nome com pelo menos 2 caracteres.";
  if (name.length > 80)
    return locale === "en"
      ? "The name must have no more than 80 characters."
      : "O nome deve ter no máximo 80 caracteres.";
  return null;
}

export function testPushSucceeded(result: { accepted: number; failed: number }) {
  return result.accepted > 0;
}
