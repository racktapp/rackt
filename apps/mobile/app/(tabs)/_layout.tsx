import { useCallback, useState } from "react";
import { Tabs, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadMatch } from "../../src/lib/storage/matchStorage";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [hasActiveMatch, setHasActiveMatch] = useState(false);

  const refreshActiveMatch = useCallback(() => {
    const stored = loadMatch();
    setHasActiveMatch(Boolean(stored && !stored.tennisState.matchWinner));
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
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8
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
            color: "#ef4444",
            fontSize: 16
          }
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: "New"
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History"
        }}
      />
      <Tabs.Screen
        name="leaderboards"
        options={{
          title: "Leaderboards"
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends"
        }}
      />
    </Tabs>
  );
}
