import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useURL } from "expo-linking";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { useAuth } from "@/providers/auth-provider";
import { ensureAuthenticatedProfile } from "@/services/profile-service";
import { consumeAuthLink } from "@/lib/auth-links";
import { claimAuthCallback, safeAuthDestination } from "@/lib/auth-callback";
export default function Callback() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { session, status, markRecoverySession } = useAuth();
  const [failed, setFailed] = useState(false);
  const incomingUrl = useURL();
  const [linkHandled, setLinkHandled] = useState(false);
  useEffect(() => {
    if (!incomingUrl || linkHandled) return;
    if (!claimAuthCallback(incomingUrl)) {
      setLinkHandled(true);
      return;
    }
    setLinkHandled(true);
    void consumeAuthLink(incomingUrl).catch(() => setFailed(true));
  }, [incomingUrl, linkHandled]);
  useEffect(() => {
    if (status === "initializing" || !linkHandled || !session) return;
    let active = true;
    void ensureAuthenticatedProfile(session.user)
      .then((profile) => {
        if (!active) return;
        if (safeAuthDestination(next)) {
          markRecoverySession();
          router.replace("/auth/reset-password");
        } else router.replace(profile.onboarded ? "/dashboard" : "/onboarding");
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [linkHandled, markRecoverySession, next, session, status]);
  if (failed)
    return (
      <ErrorState
        title="Não foi possível concluir a autenticação."
        message="O link pode ter expirado. Tente entrar novamente."
        actionLabel="Voltar para entrar"
        onAction={() => router.replace("/auth")}
      />
    );
  return <LoadingState title="Preparando seu espaço…" />;
}
