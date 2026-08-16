import * as Linking from "expo-linking";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export const authCallbackUrl = Linking.createURL("auth/callback");
export const passwordRecoveryUrl = Linking.createURL("auth/callback", {
  queryParams: { next: "/auth/reset-password" },
});

export async function consumeAuthLink(url: string): Promise<Session | null> {
  const parsed = Linking.parse(url);
  const params = parsed.queryParams ?? {};
  const code = typeof params.code === "string" ? params.code : null;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }
  const accessToken = typeof params.access_token === "string" ? params.access_token : null;
  const refreshToken = typeof params.refresh_token === "string" ? params.refresh_token : null;
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return data.session;
  }
  return null;
}
