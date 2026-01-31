import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import type { User } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase";
import SettingsDrawer from "../../src/components/SettingsDrawer";
import { ThemeColors, useSettings } from "../../src/components/SettingsProvider";

type Leaderboard = {
  id: string;
  name: string;
  sport: "tennis" | "padel" | "badminton";
  owner_id: string;
  created_at: string;
};

type LeaderboardCard = Leaderboard & {
  memberCount: number;
};

const sportLabels: Record<Leaderboard["sport"], string> = {
  tennis: "Tennis",
  padel: "Padel",
  badminton: "Badminton"
};

export default function LeaderboardsScreen() {
  const router = useRouter();
  const { colors } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaderboards, setLeaderboards] = useState<LeaderboardCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const loadLeaderboards = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      router.replace("/(auth)/sign-in");
      return;
    }

    const user: User = userData.user;

    const { data: memberRows, error: memberError } = await supabase
      .from("leaderboard_members")
      .select("leaderboard_id")
      .eq("user_id", user.id);

    if (memberError) {
      setErrorMessage(memberError.message);
      setLeaderboards([]);
      setIsLoading(false);
      return;
    }

    const leaderboardIds = (memberRows ?? []).map((row) => row.leaderboard_id);

    if (leaderboardIds.length === 0) {
      setLeaderboards([]);
      setIsLoading(false);
      return;
    }

    const { data: leaderboardRows, error: leaderboardError } = await supabase
      .from("leaderboards")
      .select("id, name, sport, owner_id, created_at")
      .in("id", leaderboardIds)
      .order("created_at", { ascending: false });

    if (leaderboardError) {
      setErrorMessage(leaderboardError.message);
      setLeaderboards([]);
      setIsLoading(false);
      return;
    }

    const { data: countRows, error: countError } = await supabase
      .from("leaderboard_members")
      .select("leaderboard_id")
      .in("leaderboard_id", leaderboardIds);

    if (countError) {
      setErrorMessage(countError.message);
      setLeaderboards([]);
      setIsLoading(false);
      return;
    }

    const countMap = new Map<string, number>();
    (countRows ?? []).forEach((row) => {
      countMap.set(row.leaderboard_id, (countMap.get(row.leaderboard_id) ?? 0) + 1);
    });

    const cards = (leaderboardRows ?? []).map((leaderboard) => ({
      ...leaderboard,
      memberCount: countMap.get(leaderboard.id) ?? 0
    }));

    setLeaderboards(cards);
    setIsLoading(false);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadLeaderboards();
    }, [loadLeaderboards])
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Leaderboards</Text>
            <Text style={styles.subtitle}>
              Keep score with private groups.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setSettingsOpen(true)}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/leaderboards/create")}
        >
          <Text style={styles.primaryButtonText}>Create leaderboard</Text>
        </TouchableOpacity>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Loading leaderboards...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Unable to load leaderboards</Text>
            <Text style={styles.emptyBody}>{errorMessage}</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={loadLeaderboards}>
              <Text style={styles.secondaryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : leaderboards.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No leaderboards yet</Text>
            <Text style={styles.emptyBody}>
              Create a leaderboard to compare ratings with friends.
            </Text>
          </View>
        ) : (
          leaderboards.map((leaderboard) => (
            <TouchableOpacity
              key={leaderboard.id}
              style={styles.card}
              onPress={() => router.push(`/leaderboards/${leaderboard.id}`)}
            >
              <Text style={styles.cardTitle}>{leaderboard.name}</Text>
              <Text style={styles.cardSport}>{sportLabels[leaderboard.sport]}</Text>
              <Text style={styles.cardMeta}>
                {leaderboard.memberCount} member
                {leaderboard.memberCount === 1 ? "" : "s"}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <SettingsDrawer
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg
    },
    container: {
      padding: 24,
      paddingBottom: 120,
      gap: 20
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 16
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text
    },
    subtitle: {
      color: colors.muted,
      marginTop: 4,
      maxWidth: 240
    },
    settingsButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardAlt,
      alignItems: "center",
      justifyContent: "center"
    },
    settingsIcon: {
      fontSize: 16
    },
    primaryButton: {
      alignSelf: "flex-start",
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999
    },
    primaryButtonText: {
      color: "#0B1220",
      fontWeight: "700",
      fontSize: 14
    },
    secondaryButton: {
      marginTop: 16,
      alignSelf: "flex-start",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border
    },
    secondaryButtonText: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 14
    },
    loadingState: {
      padding: 24,
      gap: 12,
      alignItems: "center",
      justifyContent: "center"
    },
    loadingText: {
      color: colors.muted
    },
    emptyState: {
      padding: 24,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      gap: 8
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text
    },
    emptyBody: {
      color: colors.muted,
      lineHeight: 20
    },
    card: {
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      gap: 6
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text
    },
    cardSport: {
      color: colors.muted,
      fontSize: 14
    },
    cardMeta: {
      color: colors.text,
      fontSize: 14
    }
  });
