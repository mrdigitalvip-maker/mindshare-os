import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useURL } from "expo-linking";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { consumeAuthLink } from "@/lib/auth-links";
import { claimAuthCallback, safeAuthDestination } from "@/lib/auth-callback";

export const AUTH_CALLBACK_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error("auth_callback_timeout")), timeoutMs);
      promise.finally(() => clearTimeout(timer)).catch(() => undefined);
    }),
  ]);
}

const callbackCopy = {
  "pt-BR": {
    preparing: "Preparando seu espaço…",
    title: "Não foi possível concluir a autenticação.",
    message: "O link pode ter expirado ou não ter sido recebido corretamente. Tente entrar novamente.",
    action: "Voltar para entrar",
  },
  en: {
    preparing: "Preparing your space…",
    title: "We couldn't complete authentication.",
    message: "The link may have expired or may not have been received correctly. Please sign in again.",
    action: "Back to sign in",
  },
} as const;

export default function Callback() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { session, status, recoverySession, markRecoverySession } = useAuth();
  const { resolvedLocale } = useLanguage();
  const text = callbackCopy[resolvedLocale];
  const [failed, setFailed] = useState(false);
  const incomingUrl = useURL();
  const [linkHandled, setLinkHandled] = useState(false);
  const [isRecoveryLink, setIsRecoveryLink] = useState(false);

  useEffect(() => {
    if (!incomingUrl || linkHandled || failed) return;
    if (!claimAuthCallback(incomingUrl)) {
      setLinkHandled(true);
      setFailed(true);
      return;
    }

    let active = true;
    void withTimeout(consumeAuthLink(incomingUrl), AUTH_CALLBACK_TIMEOUT_MS)
      .then(({ recovery }) => {
        if (!active) return;
        setIsRecoveryLink(recovery);
        setLinkHandled(true);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [failed, incomingUrl, linkHandled]);

  useEffect(() => {
    if (incomingUrl || linkHandled || failed) return;

    const timer = setTimeout(() => {
      const recoveryDestination = safeAuthDestination(next);
      if (status === "authenticated" && session && !recoveryDestination && !recoverySession) {
        setLinkHandled(true);
        router.replace("/");
        return;
      }
      setFailed(true);
    }, AUTH_CALLBACK_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [failed, incomingUrl, linkHandled, next, recoverySession, session, status]);

  useEffect(() => {
    if (status === "initializing" || !linkHandled || failed) return;
    if (status === "unauthenticated" || !session) {
      setFailed(true);
      return;
    }
    if ((isRecoveryLink || recoverySession) && safeAuthDestination(next)) {
      markRecoverySession();
      router.replace("/auth/reset-password");
    } else router.replace("/");
  }, [failed, isRecoveryLink, linkHandled, markRecoverySession, next, recoverySession, session, status]);

  if (failed)
    return (
      <ErrorState
        title={text.title}
        message={text.message}
        actionLabel={text.action}
        onAction={() => router.replace("/auth")}
      />
    );

  return <LoadingState title={text.preparing} />;
}
