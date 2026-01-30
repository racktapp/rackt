import { Stack } from "expo-router";

import { SettingsProvider } from "../src/components/SettingsProvider";
export default function RootLayout() {
  return (
    <SettingsProvider>
      <Stack screenOptions={{ headerShown: false }} initialRouteName="(tabs)">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="match" />
        <Stack.Screen name="summary" />
        <Stack.Screen name="history/[id]" />
      </Stack>
    </SettingsProvider>
  );
}
