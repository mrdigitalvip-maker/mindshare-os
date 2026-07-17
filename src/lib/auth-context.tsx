/**
 * Auth Context — official Supabase Auth implementation.
 *
 * Public interface is intentionally preserved so no UI/component needs to
 * change. State is kept in sync via `supabase.auth.onAuthStateChange`.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type NexoraUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  onboarded?: boolean;
  plan?: "free" | "pro";
};

type AuthContextValue = {
  user: NexoraUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUser: (patch: Partial<NexoraUser>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Map a Supabase `User` to the app-facing `NexoraUser` shape.
 * Profile-backed fields (name, avatarUrl, onboarded, plan) are read from
 * `user_metadata` for now and will migrate to a `profiles` table later.
 */
function mapUser(user: User | null): NexoraUser | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const asString = (v: unknown): string | undefined =>
    typeof v === "string" ? v : undefined;
  const asBool = (v: unknown): boolean | undefined =>
    typeof v === "boolean" ? v : undefined;
  const plan = meta.plan === "pro" ? "pro" : meta.plan === "free" ? "free" : undefined;

  return {
    id: user.id,
    email: user.email ?? "",
    name: asString(meta.name) ?? asString(meta.full_name),
    avatarUrl: asString(meta.avatar_url),
    onboarded: asBool(meta.onboarded),
    plan,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<NexoraUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Register listener first to avoid missing events during initial hydration.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(mapUser(nextSession?.user ?? null));
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setUser(mapUser(data.session?.user ?? null));
      })
      .finally(() => setLoading(false));

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const signIn: AuthContextValue["signIn"] = async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    };

    const signUp: AuthContextValue["signUp"] = async (email, password, name) => {
      const emailRedirectTo =
        typeof window !== "undefined" ? window.location.origin : undefined;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: name ? { name } : undefined,
        },
      });
      if (error) throw error;
    };

    const signOut: AuthContextValue["signOut"] = async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    };

    const resetPassword: AuthContextValue["resetPassword"] = async (email) => {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
    };

    const updateUser: AuthContextValue["updateUser"] = async (patch) => {
      // TODO: persist profile fields (name, avatarUrl, onboarded, plan) into
      // a dedicated `profiles` table via Supabase once the schema exists.
      // For now, mirror them into `user_metadata` so the mapped NexoraUser
      // stays consistent across sessions.
      const data: Record<string, unknown> = {};
      if (patch.name !== undefined) data.name = patch.name;
      if (patch.avatarUrl !== undefined) data.avatar_url = patch.avatarUrl;
      if (patch.onboarded !== undefined) data.onboarded = patch.onboarded;
      if (patch.plan !== undefined) data.plan = patch.plan;

      const { data: updated, error } = await supabase.auth.updateUser({ data });
      if (error) throw error;
      setUser(mapUser(updated.user));
    };

    return {
      user,
      loading,
      isAuthenticated: !!session && !!user,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updateUser,
    };
  }, [user, loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
