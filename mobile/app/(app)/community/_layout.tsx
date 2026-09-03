import { Stack } from "expo-router";

/** Community screens render their own product chrome, never native route titles. */
export default function CommunityLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[channelId]" />
      <Stack.Screen name="squads/[squadId]" />
    </Stack>
  );
}
