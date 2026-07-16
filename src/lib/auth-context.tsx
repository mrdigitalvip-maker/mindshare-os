/**
 * Auth Context — mock implementation backed by localStorage.
 * Structured to be swapped for Supabase Auth with minimal changes:
 * replace the internals of signIn/signUp/signOut/resetPassword and wire
 * `onAuthStateChange` to update `user`.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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
  updateUser: (patch: Partial<NexoraUser>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "nexora.session";

function readSession(): NexoraUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NexoraUser) : null;
  } catch {
    return null;
  }
}

function writeSession(user: NexoraUser | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<NexoraUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readSession());
    setLoading(false);
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email) => {
    const next: NexoraUser = {
      id: crypto.randomUUID(),
      email,
      name: email.split("@")[0],
      onboarded: true,
      plan: "free",
    };
    writeSession(next);
    setUser(next);
  };

  const signUp: AuthContextValue["signUp"] = async (email, _password, name) => {
    const next: NexoraUser = {
      id: crypto.randomUUID(),
      email,
      name: name ?? email.split("@")[0],
      onboarded: false,
      plan: "free",
    };
    writeSession(next);
    setUser(next);
  };

  const signOut: AuthContextValue["signOut"] = async () => {
    writeSession(null);
    setUser(null);
  };

  const resetPassword: AuthContextValue["resetPassword"] = async () => {
    // Placeholder — will call supabase.auth.resetPasswordForEmail once wired.
  };

  const updateUser: AuthContextValue["updateUser"] = (patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      writeSession(next);
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
