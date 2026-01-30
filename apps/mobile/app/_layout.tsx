import { Stack } from "expo-router";

import { SettingsProvider } from "../src/components/SettingsProvider";
export default function RootLayout() {
  return (
    <SettingsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SettingsProvider>
  );
}
