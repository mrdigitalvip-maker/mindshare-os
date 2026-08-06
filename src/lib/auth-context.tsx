/**
 * Auth Context — official Supabase Auth implementation.
 *
 * Public interface is intentionally preserved so no UI/component needs to
 * change. State is kept in sync via `supabase.auth.onAuthStateChange`.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { DEMO_MODE } from "@/lib/demo/config";

/** Temporary demo session used while the backend is unavailable. */
const DEMO_USER: NexoraUser = {
  id: "demo-user",
  email: "demo@nexora.os",
  name: "Alex Nexora",
  onboarded: true,
  plan: "free",
};

export type NexoraUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  onboarded?: boolean;
  plan?: "free" | "pro";
};

type SignUpResult = {
  /** true when Supabase requires email confirmation before a session exists */
  needsEmailConfirmation: boolean;
};

type AuthContextValue = {
  user: NexoraUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<SignUpResult>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
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
  const asString = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
  const asBool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);
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
    if (DEMO_MODE) {
      // Fallback layer: keep the whole app navigable without a backend.
      setUser(DEMO_USER);
      setSession({ user: { id: DEMO_USER.id } } as unknown as Session);
      setLoading(false);
      return;
    }

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
      if (DEMO_MODE) {
        setUser({ ...DEMO_USER, email });
        setSession({ user: { id: DEMO_USER.id } } as unknown as Session);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    };

    const signUp: AuthContextValue["signUp"] = async (email, password, name) => {
      if (DEMO_MODE) {
        setUser({ ...DEMO_USER, email, name: name ?? DEMO_USER.name });
        setSession({ user: { id: DEMO_USER.id } } as unknown as Session);
        return { needsEmailConfirmation: false };
      }
      const emailRedirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/confirm-email` : undefined;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: name ? { name } : undefined,
        },
      });
      if (error) throw error;
      // With "Confirm email" enabled, Supabase creates the user but returns
      // no active session until the confirmation link is clicked.
      return { needsEmailConfirmation: !data.session };
    };

    const signInWithGoogle: AuthContextValue["signInWithGoogle"] = async () => {
      if (DEMO_MODE) {
        setUser(DEMO_USER);
        setSession({ user: { id: DEMO_USER.id } } as unknown as Session);
        return;
      }
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
      // Browser navigates away to Google; nothing else to do here.
    };

    const signOut: AuthContextValue["signOut"] = async () => {
      if (DEMO_MODE) {
        setUser(null);
        setSession(null);
        return;
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    };

    const resetPassword: AuthContextValue["resetPassword"] = async (email) => {
      if (DEMO_MODE) return;
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
    };

    const updatePassword: AuthContextValue["updatePassword"] = async (newPassword) => {
      if (DEMO_MODE) return;
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    };

    const updateUser: AuthContextValue["updateUser"] = async (patch) => {
      if (DEMO_MODE) {
        setUser((prev) => ({ ...(prev ?? DEMO_USER), ...patch }));
        return;
      }
      // Profile-owned fields are mirrored into `user_metadata` here so the
      // mapped NexoraUser stays consistent across sessions; richer profile
      // persistence remains isolated in the profile service/hook layer.
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
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
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
