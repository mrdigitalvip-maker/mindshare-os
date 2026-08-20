import { Redirect } from "expo-router";

import { LoadingState } from "@/components/screen-state";
import { hasSupabaseConfig } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";

export default function Index() {
  const { status } = useAuth();
  if (status === "initializing") return <LoadingState title="Restaurando sua sessão…" />;
  if (!hasSupabaseConfig) return <Redirect href="/auth" />;
  return <Redirect href={status === "authenticated" ? "/dashboard" : "/auth"} />;
}
