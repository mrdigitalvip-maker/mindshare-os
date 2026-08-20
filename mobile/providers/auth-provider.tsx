import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { resolveAuthStatus, type AuthStatus } from "@/lib/auth-state";
import { installAuthRefreshLifecycle, supabase } from "@/lib/supabase";

type AuthState = { session: Session | null; status: AuthStatus };
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    const removeLifecycle = installAuthRefreshLifecycle();
    void supabase.auth
      .getSession()
      .then(async ({ data }) => {
        let restored = data.session;
        if (restored?.expires_at && restored.expires_at * 1000 <= Date.now() + 30_000) {
          const refreshed = await supabase.auth.refreshSession(restored);
          restored = refreshed.data.session;
        }
        if (mounted) setSession(restored);
      })
      .catch(() => {
        if (mounted) setSession(null);
      })
      .finally(() => {
        if (mounted) setInitialized(true);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setInitialized(true);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
      removeLifecycle();
    };
  }, []);

  const status = resolveAuthStatus(initialized, Boolean(session));
  const value = useMemo(() => ({ session, status }), [session, status]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
