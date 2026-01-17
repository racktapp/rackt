import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard"
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends"
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile"
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings"
        }}
      />
    </Tabs>
  );
}
