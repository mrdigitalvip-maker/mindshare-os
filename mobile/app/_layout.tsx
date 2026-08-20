import { useEffect } from "react";
import { useURL } from "expo-linking";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppErrorBoundary } from "@/components/app-error-boundary";
import { consumeAuthLink } from "@/lib/auth-links";
import { colors } from "@/lib/theme";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { useNotificationRouting } from "@/hooks/use-notification-routing";

export default function RootLayout() {
  const incomingUrl = useURL();
  useNotificationRouting();
  useEffect(() => {
    if (incomingUrl)
      void consumeAuthLink(incomingUrl).catch((error) =>
        console.error("Auth deep link failed", error),
      );
  }, [incomingUrl]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              <StatusBar style="light" backgroundColor={colors.background} translucent={false} />
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: colors.surface },
                  headerTintColor: colors.text,
                  contentStyle: { backgroundColor: colors.background },
                }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="(app)" options={{ headerShown: false }} />
              </Stack>
            </AuthProvider>
          </QueryProvider>
        </AppErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
