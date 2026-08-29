import { Redirect, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState, LoadingState } from "@/components/screen-state";
import { useProfile } from "@/hooks/use-profile";
import { colors } from "@/lib/theme";
import { useAuth } from "@/providers/auth-provider";

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const profile = useProfile();
  if (status === "initializing") return <LoadingState title="Preparando a NEXORA…" />;
  if (status === "unauthenticated") return <Redirect href="/auth" />;
  if (profile.isPending) return <LoadingState title="Preparando seu espaço…" />;
  if (profile.isError)
    return (
      <ErrorState
        title="Não foi possível carregar agora."
        message="Verifique sua conexão e tente novamente."
        actionLabel="Tentar novamente"
        onAction={() => void profile.refetch()}
      />
    );
  if (!profile.data?.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="tasks/[taskId]" options={{ headerShown: false }} />
      <Stack.Screen name="journeys/index" options={{ headerShown: false }} />
      <Stack.Screen name="journeys/[journeyId]" options={{ title: "Jornada" }} />
      <Stack.Screen name="packs/index" options={{ headerShown: false }} />
      <Stack.Screen name="packs/[slug]" options={{ title: "Programa" }} />
      <Stack.Screen name="arena" options={{ headerShown: false }} />
      <Stack.Screen name="community/index" options={{ headerShown: false }} />
      <Stack.Screen name="community/squads/[squadId]" options={{ headerShown: false }} />
      <Stack.Screen
        name="projects/[projectId]"
        options={{
          title: "Projeto",
          contentStyle: { backgroundColor: colors.background, paddingBottom: insets.bottom },
        }}
      />
      <Stack.Screen
        name="studies/index"
        options={{
          title: "Estudos",
          contentStyle: { backgroundColor: colors.background, paddingBottom: insets.bottom },
        }}
      />
      <Stack.Screen name="studies/[subjectId]/session" options={{ title: "Sessão de estudo" }} />
      <Stack.Screen
        name="studies/[subjectId]"
        options={{
          title: "Matéria",
          contentStyle: { backgroundColor: colors.background, paddingBottom: insets.bottom },
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: "Configurações",
          contentStyle: { backgroundColor: colors.background, paddingBottom: insets.bottom },
        }}
      />
      <Stack.Screen
        name="premium"
        options={{
          title: "NEXORA Premium",
          contentStyle: { backgroundColor: colors.background, paddingBottom: insets.bottom },
        }}
      />
    </Stack>
  );
}
