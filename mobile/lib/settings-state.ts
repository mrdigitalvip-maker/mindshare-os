import type { Entitlement } from "@/lib/subscription";

export type NotificationReadiness =
  "active" | "needs-registration" | "denied" | "blocked" | "undetermined" | "unsupported";

export function notificationReadiness(
  permission: "granted" | "denied" | "blocked" | "undetermined" | "unsupported",
  registered: boolean,
): NotificationReadiness {
  if (permission === "granted") return registered ? "active" : "needs-registration";
  return permission;
}

export const notificationCopy: Record<
  NotificationReadiness,
  { title: string; description: string; action?: string }
> = {
  active: {
    title: "Ativadas neste dispositivo",
    description: "Este aparelho está pronto para receber lembretes da NEXORA.",
  },
  "needs-registration": {
    title: "Precisam ser concluídas",
    description: "A permissão está ativa, mas este aparelho ainda precisa ser registrado.",
    action: "Concluir ativação",
  },
  denied: {
    title: "Desativadas",
    description: "A NEXORA não pode enviar lembretes neste aparelho.",
    action: "Tentar novamente",
  },
  blocked: {
    title: "Bloqueadas neste dispositivo",
    description: "Autorize as notificações nas configurações do aparelho.",
    action: "Abrir configurações do aparelho",
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

export function subscriptionPlanLabel(entitlement?: Entitlement): "Gratuito" | "Premium" {
  return entitlement === "active" || entitlement === "trialing" ? "Premium" : "Gratuito";
}

export function validateProfileName(value: string): string | null {
  const name = value.trim();
  if (name.length < 2) return "Informe um nome com pelo menos 2 caracteres.";
  if (name.length > 80) return "O nome deve ter no máximo 80 caracteres.";
  return null;
}

export function testPushSucceeded(result: { accepted: number; failed: number }) {
  return result.accepted > 0;
}
