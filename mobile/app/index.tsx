import { Redirect } from "expo-router";

import { ErrorState, LoadingState } from "@/components/screen-state";
import { hasSupabaseConfig } from "@/lib/supabase";
import { useAccountLifecycle } from "@/hooks/use-profile";
import { lifecycleDestination } from "@/lib/auth-state";

export default function Index() {
  const lifecycle = useAccountLifecycle();
  if (!hasSupabaseConfig) return <Redirect href="/auth" />;
  if (lifecycle.state === "authenticating") return <LoadingState title="Restaurando sua sessão…" />;
  if (lifecycle.state === "recoverable_error")
    return (
      <ErrorState
        title="Não foi possível preparar seu espaço."
        message="Verifique sua conexão e tente novamente. Seus dados não serão duplicados."
        actionLabel="Tentar novamente"
        onAction={() => void lifecycle.retry()}
      />
    );
  const destination = lifecycleDestination(lifecycle.state);
  if (!destination) return <LoadingState title="Preparando seu espaço…" />;
  return <Redirect href={destination} />;
}
