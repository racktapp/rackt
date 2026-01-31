import { Stack } from "expo-router";

import PushNotificationManager from "../src/components/PushNotificationManager";
import { SettingsProvider } from "../src/components/SettingsProvider";
export default function RootLayout() {
  return (
    <SettingsProvider>
      <PushNotificationManager />
      <Stack screenOptions={{ headerShown: false }} initialRouteName="(tabs)">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="leaderboards/create" />
        <Stack.Screen name="leaderboards/[leaderboardId]" />
        <Stack.Screen name="match" />
        <Stack.Screen name="summary" />
        <Stack.Screen name="history/[id]" />
      </Stack>
    </SettingsProvider>
  );
}
