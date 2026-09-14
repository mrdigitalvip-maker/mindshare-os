import { Redirect } from "expo-router";

import { ErrorState, LoadingState } from "@/components/screen-state";
import { hasSupabaseConfig } from "@/lib/supabase";
import { useAccountLifecycle } from "@/hooks/use-profile";
import { lifecycleDestination } from "@/lib/auth-state";
import { useLanguage } from "@/providers/language-provider";

const lifecycleCopy = {
  "pt-BR": {
    restoring: "Restaurando sua sessão…",
    preparing: "Preparando seu espaço…",
    errorTitle: "Não foi possível preparar seu espaço.",
    errorMessage: "Verifique sua conexão e tente novamente. Seus dados não serão duplicados.",
    retry: "Tentar novamente",
  },
  en: {
    restoring: "Restoring your session…",
    preparing: "Preparing your space…",
    errorTitle: "We couldn't prepare your space.",
    errorMessage: "Check your connection and try again. Your data will not be duplicated.",
    retry: "Try again",
  },
} as const;

export default function Index() {
  const lifecycle = useAccountLifecycle();
  const { resolvedLocale } = useLanguage();
  const text = lifecycleCopy[resolvedLocale];

  if (!hasSupabaseConfig) return <Redirect href="/auth" />;
  if (lifecycle.state === "authenticating") return <LoadingState title={text.restoring} />;
  if (lifecycle.state === "recoverable_error")
    return (
      <ErrorState
        title={text.errorTitle}
        message={text.errorMessage}
        actionLabel={text.retry}
        onAction={() => void lifecycle.retry()}
      />
    );
  const destination = lifecycleDestination(lifecycle.state);
  if (!destination) return <LoadingState title={text.preparing} />;
  return <Redirect href={destination} />;
}
