import { Redirect } from "expo-router";

import { LoadingState } from "@/components/screen-state";
import { hasSupabaseConfig } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";

const lifecycleCopy = {
  "pt-BR": { restoring: "Restaurando sua sessão…" },
  en: { restoring: "Restoring your session…" },
} as const;

/**
 * Root routing intentionally depends only on the authenticated session.
 * Profile provisioning is a recoverable concern handled by onboarding, so a
 * slow/missing profile can never strand a signed-in user on a loading screen.
 */
export default function Index() {
  const { status } = useAuth();
  const { resolvedLocale } = useLanguage();
  const text = lifecycleCopy[resolvedLocale];

  if (!hasSupabaseConfig) return <Redirect href="/auth" />;
  if (status === "initializing") return <LoadingState title={text.restoring} />;
  if (status === "unauthenticated") return <Redirect href="/auth" />;
  return <Redirect href="/onboarding" />;
}
