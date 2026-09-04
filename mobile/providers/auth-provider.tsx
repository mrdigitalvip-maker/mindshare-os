import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import { resolveAuthStatus, type AuthStatus } from "@/lib/auth-state";
import { installAuthRefreshLifecycle, supabase } from "@/lib/supabase";

type AuthState = {
  session: Session | null;
  status: AuthStatus;
  recoverySession: boolean;
  markRecoverySession(): void;
  clearRecoverySession(): void;
};
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [recoverySession, setRecoverySession] = useState(false);
  const activeUserId = useRef<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const recoveryUserId = useRef<string | null>(null);
  const authRevision = useRef(0);

  useEffect(() => {
    let mounted = true;
    const removeLifecycle = installAuthRefreshLifecycle();
    const restoreRevision = authRevision.current;
    void supabase.auth
      .getSession()
      .then(async ({ data }) => {
        let restored = data.session;
        if (restored?.expires_at && restored.expires_at * 1000 <= Date.now() + 30_000) {
          const refreshed = await supabase.auth.refreshSession(restored);
          restored = refreshed.data.session;
        }
        if (mounted && restoreRevision === authRevision.current) {
          const restoredUserId = restored?.user.id ?? null;
          if (activeUserId.current !== restoredUserId) {
            void queryClient.cancelQueries();
            queryClient.clear();
          }
          activeUserId.current = restoredUserId;
          sessionRef.current = restored;
          setSession(restored);
        }
      })
      .catch(() => {
        if (mounted && restoreRevision === authRevision.current) {
          if (activeUserId.current !== null) {
            void queryClient.cancelQueries();
            queryClient.clear();
          }
          activeUserId.current = null;
          sessionRef.current = null;
          recoveryUserId.current = null;
          setRecoverySession(false);
          setSession(null);
        }
      })
      .finally(() => {
        if (mounted) setInitialized(true);
      });
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      authRevision.current += 1;
      // Clear before exposing a different identity to descendants. A token refresh for the
      // same identity is deliberately neutral.
      const nextUserId = nextSession?.user.id ?? null;
      if (activeUserId.current !== nextUserId) {
        void queryClient.cancelQueries();
        queryClient.clear();
        recoveryUserId.current = null;
        setRecoverySession(false);
      }
      activeUserId.current = nextUserId;
      sessionRef.current = nextSession;
      if (event === "PASSWORD_RECOVERY" && nextUserId) {
        recoveryUserId.current = nextUserId;
        setRecoverySession(true);
      } else if (event === "SIGNED_OUT") {
        recoveryUserId.current = null;
        setRecoverySession(false);
      }
      setSession(nextSession);
      setInitialized(true);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
      removeLifecycle();
    };
  }, [queryClient]);

  const status = resolveAuthStatus(initialized, Boolean(session));
  const hasRecoverySession =
    recoverySession && recoveryUserId.current === (session?.user.id ?? null);
  const markRecoverySession = useCallback(() => {
    const userId = sessionRef.current?.user.id;
    if (!userId) return;
    recoveryUserId.current = userId;
    setRecoverySession(true);
  }, []);
  const clearRecoverySession = useCallback(() => {
    recoveryUserId.current = null;
    setRecoverySession(false);
  }, []);
  const value = useMemo(
    () => ({
      session,
      status,
      recoverySession: hasRecoverySession,
      markRecoverySession,
      clearRecoverySession,
    }),
    [session, status, hasRecoverySession, markRecoverySession, clearRecoverySession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
