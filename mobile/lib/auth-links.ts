import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { parseAuthLink } from "@/lib/auth-callback";

export const authCallbackUrl = "nexora://auth/callback";
export const passwordRecoveryUrl = `${authCallbackUrl}?next=${encodeURIComponent("/auth/reset-password")}`;

export type ConsumedAuthLink = { session: Session | null; recovery: boolean };

export async function consumeAuthLink(url: string): Promise<ConsumedAuthLink> {
  const payload = parseAuthLink(url);
  if (payload.error) throw new Error(payload.error);
  const code = payload.code;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return { session: data.session, recovery: payload.recovery };
  }
  const accessToken = payload.accessToken;
  const refreshToken = payload.refreshToken;
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return { session: data.session, recovery: payload.recovery };
  }
  throw new Error("invalid_callback");
}
