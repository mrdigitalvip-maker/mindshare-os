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

type FirstDestination = "/assistant" | "/projects" | "/studies" | "/productivity";
type FirstChoice = {
  label: string;
  description: string;
  symbol: string;
  goal: "Just exploring" | "Manage projects" | "Learn & study" | "Boost my productivity";
  destination: FirstDestination;
};

const onboardingCopy = {
  "pt-BR": {
    preparing: "Restaurando sua sessão…",
    welcomeLabel: "BEM-VINDO À KIVRYN",
    welcomeTitle: "Como devemos chamar você?",
    firstWinLabel: "SUA PRIMEIRA VITÓRIA",
    firstWinTitle: "O que você quer fazer primeiro?",
    firstWinHelp: "Escolha uma porta. Em menos de um minuto, a KIVRYN te coloca no lugar certo para começar.",
    namePlaceholder: "Seu nome",
    saving: "Preparando…",
    continue: "Continuar",
    back: "Voltar",
    completeError: "Não foi possível concluir agora. Seu nome foi mantido; tente novamente.",
    choices: [
      {
        label: "Planejar meu primeiro passo",
        description: "Conte à KIVRYN o que você quer alcançar e organize o próximo movimento.",
        symbol: "✦",
        goal: "Just exploring",
        destination: "/assistant",
      },
      {
        label: "Criar meu primeiro projeto",
        description: "Transforme uma ideia ou objetivo em trabalho organizado.",
        symbol: "◇",
        goal: "Manage projects",
        destination: "/projects",
      },
      {
        label: "Começar a estudar",
        description: "Abra um espaço de estudo e evolua com estrutura.",
        symbol: "◫",
        goal: "Learn & study",
        destination: "/studies",
      },
      {
        label: "Organizar meu dia",
        description: "Crie tarefas e escolha o que merece sua atenção agora.",
        symbol: "✓",
        goal: "Boost my productivity",
        destination: "/productivity",
      },
    ] satisfies FirstChoice[],
  },
  en: {
    preparing: "Restoring your session…",
    welcomeLabel: "WELCOME TO KIVRYN",
    welcomeTitle: "What should we call you?",
    firstWinLabel: "YOUR FIRST WIN",
    firstWinTitle: "What do you want to do first?",
    firstWinHelp: "Choose one door. In under a minute, KIVRYN will put you in the right place to begin.",
    namePlaceholder: "Your name",
    saving: "Preparing…",
    continue: "Continue",
    back: "Back",
    completeError: "We couldn't finish right now. Your name was kept; please try again.",
    choices: [
      {
        label: "Plan my first move",
        description: "Tell KIVRYN what you want to achieve and organize the next step.",
        symbol: "✦",
        goal: "Just exploring",
        destination: "/assistant",
      },
      {
        label: "Create my first project",
        description: "Turn an idea or objective into organized work.",
        symbol: "◇",
        goal: "Manage projects",
        destination: "/projects",
      },
      {
        label: "Start learning",
        description: "Open a study space and make structured progress.",
        symbol: "◫",
        goal: "Learn & study",
        destination: "/studies",
      },
      {
        label: "Organize my day",
        description: "Create tasks and choose what deserves your attention now.",
        symbol: "✓",
        goal: "Boost my productivity",
        destination: "/productivity",
      },
    ] satisfies FirstChoice[],
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
  const [step, setStep] = useState<0 | 1>(0);
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
  if (profile.data?.onboarded && !busy) return <Redirect href="/dashboard" />;

  function continueToFirstWin() {
    const normalizedName = name.trim();
    if (!normalizedName || normalizedName.length > 80) return;
    setErrorMessage(undefined);
    setStep(1);
  }

  async function complete(choice: FirstChoice) {
    const normalizedName = name.trim();
    if (!session || !normalizedName || normalizedName.length > 80 || submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    setErrorMessage(undefined);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: session.user.id,
        full_name: normalizedName,
        primary_goal: choice.goal,
        onboarded: true,
      });
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
      router.replace(choice.destination);
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
      <NexoraAgent size={150} state={step === 1 || name ? "attention" : "quiet"} />
      <Text style={s.eyebrow}>{step === 0 ? text.welcomeLabel : text.firstWinLabel}</Text>
      <Text style={s.title}>{step === 0 ? text.welcomeTitle : text.firstWinTitle}</Text>
      <Text style={s.progress}>{step + 1} / 2</Text>

      {step === 0 ? (
        <View style={s.composer}>
          <TextInput
            autoFocus
            value={name}
            onChangeText={setName}
            maxLength={80}
            placeholder={text.namePlaceholder}
            placeholderTextColor={colors.textMuted}
            style={s.input}
            returnKeyType="next"
            onSubmitEditing={continueToFirstWin}
          />

          <Pressable
            disabled={!name.trim() || busy}
            onPress={continueToFirstWin}
            style={({ pressed }) => [s.send, pressed && s.pressed, (!name.trim() || busy) && s.disabled]}
          >
            <Text style={s.sendText}>{text.continue}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.firstWinBlock}>
          <Text style={s.help}>{text.firstWinHelp}</Text>
          <View style={s.choiceList}>
            {text.choices.map((choice) => (
              <Pressable
                key={choice.goal}
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void complete(choice)}
                style={({ pressed }) => [s.choiceCard, pressed && s.pressed, busy && s.disabled]}
              >
                <View style={s.choiceSymbol}>
                  <Text style={s.choiceSymbolText}>{choice.symbol}</Text>
                </View>
                <View style={s.choiceCopy}>
                  <Text style={s.choiceTitle}>{choice.label}</Text>
                  <Text style={s.choiceDescription}>{choice.description}</Text>
                </View>
                <Text style={s.choiceArrow}>→</Text>
              </Pressable>
            ))}
          </View>
          <Pressable disabled={busy} onPress={() => setStep(0)} style={s.backButton}>
            <Text style={s.backText}>← {text.back}</Text>
          </Pressable>
          {busy ? <Text style={s.busy}>{text.saving}</Text> : null}
        </View>
      )}

      {errorMessage ? <Text style={s.error}>{errorMessage}</Text> : null}
    </AppScreen>
  );
}

const s = StyleSheet.create({
  page: {
    flexGrow: 1,
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright, letterSpacing: 1.5 },
  title: { ...typography.display, fontSize: 34, lineHeight: 40, color: colors.text },
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
    textAlignVertical: "center",
  },
  send: {
    minWidth: 96,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: colors.primaryBright,
  },
  sendText: { ...typography.label, color: colors.background, fontWeight: "800" },
  firstWinBlock: { gap: spacing.md },
  help: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  choiceList: { gap: spacing.sm },
  choiceCard: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(82,229,255,0.16)",
    backgroundColor: colors.surface,
  },
  choiceSymbol: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "rgba(82,229,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(82,229,255,0.15)",
  },
  choiceSymbolText: { color: colors.primaryBright, fontSize: 19, fontWeight: "800" },
  choiceCopy: { flex: 1, minWidth: 0 },
  choiceTitle: { ...typography.label, color: colors.text, fontSize: 15 },
  choiceDescription: { ...typography.caption, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  choiceArrow: { color: colors.primaryBright, fontSize: 19, fontWeight: "700" },
  backButton: { minHeight: 42, alignSelf: "flex-start", justifyContent: "center", paddingRight: spacing.md },
  backText: { ...typography.label, color: colors.textMuted },
  busy: { ...typography.caption, color: colors.primaryBright },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.55 },
  error: { ...typography.body, color: colors.danger },
});
