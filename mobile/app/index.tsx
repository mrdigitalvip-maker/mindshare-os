import { Redirect } from "expo-router";

import { LoadingState } from "@/components/screen-state";
import { hasSupabaseConfig } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { useProfile } from "@/hooks/use-profile";
import { resolveAppDestination } from "@/lib/auth-state";

export default function Index() {
  const { status } = useAuth();
  const profile = useProfile();
  if (status === "initializing") return <LoadingState title="Restaurando sua sessão…" />;
  if (!hasSupabaseConfig) return <Redirect href="/auth" />;
  const destination = resolveAppDestination({
    authStatus: status,
    onboarding: profile.isPending
      ? "loading"
      : profile.isError
        ? "error"
        : profile.data?.onboarded
          ? "complete"
          : "incomplete",
  });
  if (!destination) return <LoadingState title="Preparando seu espaço…" />;
  return <Redirect href={destination} />;
}
