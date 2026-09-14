import { LocalizedCopy } from "@/components/localized-copy";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect, router } from "expo-router";
import { NexoraAgent } from "@/components/nexora-agent";
import { AppScreen } from "@/components/app-screen";
import { LoadingState } from "@/components/screen-state";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useProfile } from "@/hooks/use-profile";
import type { ProfileIdentity } from "@/lib/profile-identity";

const onboardingCopy = {
  "pt-BR": {
    preparing: "Restaurando sua sessão…",
    namePlaceholder: "Seu nome",
    saving: "Salvando…",
    start: "Começar",
    completeError: "Não foi possível concluir agora. Seu nome foi mantido; tente novamente.",
  },
  en: {
    preparing: "Restoring your session…",
    namePlaceholder: "Your name",
    saving: "Saving…",
    start: "Start",
    completeError: "We couldn't finish right now. Your name was kept; please try again.",
  },
} as const;

const metadataName = (metadata: Record<string, unknown> | undefined) => {
  const value = metadata?.full_name ?? metadata?.name;
  return typeof value === "string" && value.trim() ? value.trim() : "";
};

export default function Onboarding() {
  const { session, status } = useAuth();
  const { resolvedLocale } = useLanguage();
  const text = onboardingCopy[resolvedLocale];
  const client = useQueryClient();
  const profile = useProfile();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const submitLock = useRef(false);

  useEffect(() => {
    if (name) return;
    const suggested = profile.data?.displayName ?? metadataName(session?.user.user_metadata);
    if (suggested) setName(suggested);
  }, [name, profile.data?.displayName, session?.user.user_metadata]);

  if (status === "initializing") return <LoadingState title={text.preparing} />;
  if (status === "unauthenticated" || !session) return <Redirect href="/auth" />;
  if (profile.data?.onboarded) return <Redirect href="/dashboard" />;

  async function complete() {
    const normalizedName = name.trim();
    if (!session || !normalizedName || normalizedName.length > 80 || submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    setErrorMessage(undefined);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: session.user.id, full_name: normalizedName, onboarded: true });
      if (error) throw error;

      const cached: ProfileIdentity = {
        id: session.user.id,
        fullName: normalizedName,
        avatarUrl: profile.data?.avatarUrl ?? null,
        onboarded: true,
        displayName: normalizedName,
        email: session.user.email ?? null,
        provider:
          profile.data?.provider ??
          (typeof session.user.app_metadata?.provider === "string"
            ? session.user.app_metadata.provider
            : "email"),
      };
      client.setQueryData([...queryKeys.profile, session.user.id], cached);
      router.replace("/dashboard");
      void client.invalidateQueries({ queryKey: queryKeys.profile });
    } catch {
      setErrorMessage(text.completeError);
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }

  return (
    <AppScreen keyboard includeBottomInset contentContainerStyle={s.page}>
      <NexoraAgent size={160} state={name ? "attention" : "quiet"} />
      <Text style={s.eyebrow}>
        <LocalizedCopy copyKey="legacy.f0d0f712a8a3" />
      </Text>
      <Text style={s.title}>
        <LocalizedCopy copyKey="legacy.058630664715" />
      </Text>
      <Text style={s.progress}>
        <LocalizedCopy copyKey="legacy.10b65ea80386" />
      </Text>
      <View style={s.composer}>
        <TextInput
          autoFocus
          value={name}
          onChangeText={setName}
          maxLength={80}
          placeholder={text.namePlaceholder}
          placeholderTextColor={colors.textMuted}
          style={s.input}
        />

        <Pressable disabled={!name.trim() || busy} onPress={() => void complete()} style={s.send}>
          <Text style={s.sendText}>{busy ? text.saving : text.start}</Text>
        </Pressable>
      </View>
      {errorMessage ? <Text style={s.error}>{errorMessage}</Text> : null}
    </AppScreen>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
  },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  title: { ...typography.display, fontSize: 36, color: colors.text },
  progress: { ...typography.label, color: colors.textMuted },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    ...typography.body,
    flex: 1,
    minHeight: 48,
    color: colors.text,
    textAlignVertical: "top",
  },
  send: {
    minWidth: 96,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: colors.primaryBright,
  },
  sendText: { ...typography.label, color: colors.background },
  error: { ...typography.body, color: colors.danger },
});
