import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, layout, typography } from "@/lib/theme";

const icons: Record<string, string> = {
  dashboard: "⌂",
  assistant: "✦",
  projects: "◇",
  productivity: "✓",
  more: "•••",
};

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primaryBright,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { ...typography.caption, fontSize: 11, lineHeight: 15, marginTop: 1 },
        tabBarStyle: {
          height: layout.tabBarBaseHeight + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 7),
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: route.name === "more" ? 17 : 21 }}>
            {icons[route.name]}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Início" }} />
      <Tabs.Screen name="assistant" options={{ title: "Assistente" }} />
      <Tabs.Screen name="projects/index" options={{ title: "Projetos" }} />
      <Tabs.Screen name="productivity" options={{ title: "Tarefas" }} />
      <Tabs.Screen name="more" options={{ title: "Mais" }} />
    </Tabs>
  );
}
