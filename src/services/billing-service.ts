import { DEMO_MODE } from "@/lib/demo/config";
import { supabase } from "@/lib/supabase";

type BillingErrorPayload = { error?: { code?: string } | string };

const BILLING_ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Sua sessão expirou. Entre novamente para continuar.",
  origin_not_allowed: "A conexão de pagamento foi bloqueada pela origem do aplicativo. Atualize a página e tente novamente.",
  configuration_error: "O pagamento Premium ainda não está configurado corretamente.",
  stripe_configuration_error: "A conexão segura com o Stripe precisa ser atualizada.",
  price_not_configured: "O plano Premium de US$12/mês ainda não está configurado no Stripe.",
  price_configuration_ambiguous: "Há mais de um preço Premium compatível no Stripe e o plano precisa ser identificado.",
  invalid_price: "O preço configurado para o Premium não está disponível.",
  subscription_exists: "Sua assinatura Premium já está ativa ou em período de teste.",
  stripe_rate_limited: "O Stripe está recebendo muitas solicitações. Tente novamente em instantes.",
  stripe_error: "Não foi possível iniciar o pagamento no Stripe. Tente novamente.",
  checkout_error: "Não foi possível iniciar o checkout Premium.",
  portal_unavailable: "Não foi possível abrir o gerenciamento da assinatura.",
  subscription_not_found: "Nenhuma assinatura Stripe foi encontrada para esta conta.",
  persistence_error: "Não foi possível confirmar o estado da assinatura.",
};

async function readFunctionError(error: unknown): Promise<string | null> {
  const context = (error as { context?: Response } | null)?.context;
  if (!context || typeof context.clone !== "function") return null;
  try {
    const payload = (await context.clone().json()) as BillingErrorPayload;
    if (typeof payload.error === "string") return payload.error;
    if (payload.error && typeof payload.error.code === "string") return payload.error.code;
  } catch {
    // Fall through to the generic error if the function did not return JSON.
  }
  return null;
}

async function accessToken(forceRefresh = false): Promise<string> {
  if (forceRefresh) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) {
      throw new Error("Sua sessão expirou. Entre novamente para continuar.");
    }
    return data.session.access_token;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Sua sessão expirou. Entre novamente para continuar.");
  }

  if (data.session.expires_at && data.session.expires_at * 1000 - Date.now() < 60_000) {
    return accessToken(true);
  }

  return data.session.access_token;
}

async function invokeBillingFunction(name: "create-checkout-session" | "create-portal-session") {
  const call = async (forceRefresh = false) => {
    const token = await accessToken(forceRefresh);
    return supabase.functions.invoke<{ url?: string; error?: { code?: string } }>(name, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  let result = await call();
  if (result.error && (result.error as { context?: Response }).context?.status === 401) {
    result = await call(true);
  }
  if (result.error) {
    const code = await readFunctionError(result.error);
    if (code) throw new Error(BILLING_ERROR_MESSAGES[code] ?? `Pagamento indisponível (${code}).`);
    throw new Error("Não foi possível conectar ao serviço de pagamento. Tente novamente.");
  }
  if (!result.data?.url) throw new Error("O Stripe não retornou uma URL válida.");
  return result.data.url;
}

export const BillingService = {
  async createCheckoutUrl(): Promise<string | null> {
    if (DEMO_MODE) return null;
    return invokeBillingFunction("create-checkout-session");
  },

  async createPortalUrl(): Promise<string | null> {
    if (DEMO_MODE) return null;
    return invokeBillingFunction("create-portal-session");
  },
};
