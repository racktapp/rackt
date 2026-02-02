import { useCallback, useState } from "react";
import { Tabs, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadMatch } from "../../src/lib/storage/matchStorage";
import { useSettings } from "../../src/components/SettingsProvider";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [hasActiveMatch, setHasActiveMatch] = useState(false);
  const { colors } = useSettings();

  const refreshActiveMatch = useCallback(() => {
    const stored = loadMatch();
    setHasActiveMatch(
      Boolean(stored && !stored.matchState.score.matchWinner)
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshActiveMatch();
    }, [refreshActiveMatch])
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          backgroundColor: colors.card,
          borderTopColor: colors.border
        },
        tabBarLabelStyle: {
          fontSize: 12
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarBadge: hasActiveMatch ? "•" : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "transparent",
            color: colors.danger,
            fontSize: 16
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: "Match",
          tabBarLabel: "Match",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="leaderboards"
        options={{
          title: "Boards",
          tabBarLabel: "Boards",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" color={color} size={size} />
          )
        }}
      />
    </Tabs>
  );
}
