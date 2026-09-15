import { Redirect, Stack, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ModuleAtmosphere } from "@/components/module-atmosphere";
import { LoadingState } from "@/components/screen-state";
import { useAccountLifecycle } from "@/hooks/use-profile";
import { useUsageTracker } from "@/hooks/use-usage-analytics";
import { colors } from "@/lib/theme";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { status } = useAuth();
  const lifecycle = useAccountLifecycle();
  const { t, resolvedLocale } = useLanguage();
  const en = resolvedLocale === "en";
  useUsageTracker();
  if (status === "initializing")
    return <LoadingState title={en ? "Preparing KIVRYN…" : "Preparando a KIVRYN…"} />;
  if (status === "unauthenticated") return <Redirect href="/auth" />;
  if (lifecycle.state !== "ready") return <Redirect href="/" />;
  return (
    <>
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
        <Stack.Screen name="journeys/[journeyId]" options={{ title: en ? "Journey" : "Jornada" }} />
        <Stack.Screen name="packs/index" options={{ headerShown: false }} />
        <Stack.Screen name="packs/[slug]" options={{ title: en ? "Program" : "Programa" }} />
        <Stack.Screen name="arena" options={{ headerShown: false }} />
        <Stack.Screen name="challenges" options={{ headerShown: false }} />
        <Stack.Screen name="community" options={{ headerShown: false }} />
        <Stack.Screen name="agents" options={{ headerShown: false }} />
        <Stack.Screen name="passport/index" options={{ headerShown: false }} />
        <Stack.Screen name="passport/setup" options={{ headerShown: false }} />
        <Stack.Screen name="passport/placement" options={{ headerShown: false }} />
        <Stack.Screen name="passport/review" options={{ headerShown: false }} />
        <Stack.Screen name="passport/roleplay" options={{ headerShown: false }} />
        <Stack.Screen name="passport/missions" options={{ headerShown: false }} />
        <Stack.Screen name="passport/listening" options={{ headerShown: false }} />
        <Stack.Screen name="passport/lesson/[lessonId]" options={{ headerShown: false }} />
        <Stack.Screen name="creator/index" options={{ title: t("creator.title") }} />
        <Stack.Screen name="creator/new" options={{ title: t("creator.new") }} />
        <Stack.Screen name="creator/[projectId]" options={{ title: t("creator.studio") }} />
        <Stack.Screen name="creator/setup" options={{ title: t("creator.setup") }} />
        <Stack.Screen name="creator/profile" options={{ title: t("creator.profileBuilder") }} />
        <Stack.Screen name="creator/pillars" options={{ title: t("creator.pillars") }} />
        <Stack.Screen name="creator/strategy" options={{ title: t("creator.strategy") }} />
        <Stack.Screen name="creator/hook-lab" options={{ title: t("creator.hookLab") }} />
        <Stack.Screen name="creator/academy/index" options={{ title: t("creator.academy") }} />
        <Stack.Screen name="creator/academy/[lessonKey]" options={{ title: t("creator.academy") }} />
        <Stack.Screen name="creator/library" options={{ title: t("creator.library") }} />
        <Stack.Screen name="creator/import" options={{ title: t("creator.media") }} />
        <Stack.Screen name="creator/map" options={{ title: t("creator.map") }} />
        <Stack.Screen name="creator/analytics" options={{ title: t("creator.analytics") }} />
        <Stack.Screen name="creator/copilot" options={{ title: t("creator.copilot") }} />
        <Stack.Screen name="creator/goals" options={{ title: t("creator.goals") }} />
        <Stack.Screen
          name="projects/[projectId]"
          options={{
            title: en ? "Project" : "Projeto",
            contentStyle: { backgroundColor: colors.background, paddingBottom: insets.bottom },
          }}
        />
        <Stack.Screen
          name="studies/index"
          options={{
            title: en ? "Studies" : "Estudos",
            contentStyle: { backgroundColor: colors.background, paddingBottom: insets.bottom },
          }}
        />
        <Stack.Screen
          name="studies/[subjectId]/session"
          options={{ title: en ? "Study session" : "Sessão de estudo" }}
        />
        <Stack.Screen
          name="studies/[subjectId]"
          options={{
            title: en ? "Subject" : "Matéria",
            contentStyle: { backgroundColor: colors.background, paddingBottom: insets.bottom },
          }}
        />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen
          name="premium"
          options={{
            title: "KIVRYN Premium",
            contentStyle: { backgroundColor: colors.background, paddingBottom: insets.bottom },
          }}
        />
      </Stack>
      <ModuleAtmosphere pathname={pathname} />
    </>
  );
}
