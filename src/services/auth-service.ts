export const AuthService = {
  async hasRecoverySession(): Promise<boolean> {
    const { DEMO_MODE } = await import("@/lib/demo/config");
    if (DEMO_MODE) return true;
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session);
  },
};
