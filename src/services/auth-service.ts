export const AuthService = {
  async hasRecoverySession(): Promise<boolean> {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session);
  },
};
