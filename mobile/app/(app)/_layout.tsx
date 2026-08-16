import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "@/lib/theme";
import { useAuth } from "@/providers/auth-provider";
import { LoadingState } from "@/components/screen-state";
import { ErrorState } from "@/components/screen-state";
import { useProfile } from "@/hooks/use-profile";
const icons: Record<string, string> = {
  dashboard: "⌂",
  assistant: "✦",
  projects: "◇",
  productivity: "✓",
  more: "•••",
};
export default function AppLayout() {
  const { status } = useAuth();
  const profile = useProfile();
  if (status === "initializing") return <LoadingState title="Loading NEXORA…" />;
  if (status === "unauthenticated") return <Redirect href="/auth" />;
  if (profile.isPending) return <LoadingState title="Preparing your command center…" />;
  if (profile.isError)
    return (
      <ErrorState
        title="Profile unavailable"
        message="Your session is still secure. Check your connection and retry."
        actionLabel="Retry"
        onAction={() => void profile.refetch()}
      />
    );
  if (!profile.data?.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primaryBright,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 20 }}>{icons[route.name] ?? "·"}</Text>
        ),
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Home" }} />
      <Tabs.Screen name="assistant" options={{ title: "Assistant" }} />
      <Tabs.Screen name="projects" options={{ title: "Projects" }} />
      <Tabs.Screen name="productivity" options={{ title: "Tasks" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
      <Tabs.Screen name="studies" options={{ href: null, title: "Studies" }} />
      <Tabs.Screen name="settings" options={{ href: null, title: "Settings" }} />
    </Tabs>
  );
}
