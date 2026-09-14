import { DEMO_MODE } from "@/lib/demo/config";
import { supabase } from "@/lib/supabase";

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
  if (result.error) throw result.error;
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
