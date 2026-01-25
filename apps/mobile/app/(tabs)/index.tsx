import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { router } from "expo-router";

import { supabase } from "../../lib/supabase";
import Scoreboard from "../../src/components/Scoreboard";

type SportRating = {
  sport: string;
  level: number | null;
  reliability: number | null;
  source: string | null;
  matches_competitive: number | null;
  updated_at: string | null;
};

type StatsSummary = {
  confirmedMatches: number;
  wins: number;
  losses: number;
  winRate: number;
};

const formatSportLabel = (sport: string) =>
  sport
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatLevel = (level: number | null) =>
  level === null || Number.isNaN(level) ? "—" : level.toFixed(1);

const formatReliability = (reliability: number | null) =>
  reliability === null || Number.isNaN(reliability)
    ? "—"
    : `${Math.round(reliability)}%`;

const emptyStats: StatsSummary = {
  confirmedMatches: 0,
  wins: 0,
  losses: 0,
  winRate: 0
};

export default function HomeScreen() {
  const [ratings, setRatings] = useState<SportRating[]>([]);
  const [stats, setStats] = useState<StatsSummary>(emptyStats);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRatings = useCallback(async () => {
    setIsLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setIsLoading(false);
      router.replace("/(auth)/sign-in");
      return;
    }

    const { data, error } = await supabase
      .from("sport_ratings")
      .select("sport, level, reliability, source, matches_competitive, updated_at")
      .eq("user_id", userData.user.id)
      .order("sport", { ascending: true });

    if (error) {
      Alert.alert("Unable to load ratings", error.message);
      setRatings([]);
    } else {
      setRatings(data ?? []);
    }

    const { data: myPlayers, error: myPlayersError } = await supabase
      .from("match_players")
      .select("match_id, side")
      .eq("user_id", userData.user.id);

    if (myPlayersError) {
      Alert.alert("Unable to load stats", myPlayersError.message);
      setStats(emptyStats);
      setIsLoading(false);
      return;
    }

    const matchIds = Array.from(
      new Set((myPlayers ?? []).map((row) => row.match_id))
    );

    if (matchIds.length === 0) {
      setStats(emptyStats);
      setIsLoading(false);
      return;
    }

    const { data: matchRows, error: matchesError } = await supabase
      .from("matches")
      .select("id, status, winner_side")
      .in("id", matchIds)
      .eq("status", "confirmed");

    if (matchesError) {
      Alert.alert("Unable to load stats", matchesError.message);
      setStats(emptyStats);
      setIsLoading(false);
      return;
    }

    const mySideByMatchId = new Map<number, number>();
    (myPlayers ?? []).forEach((row) => {
      const side = Number(row.side);
      if (side === 1 || side === 2) {
        mySideByMatchId.set(row.match_id, side);
      }
    });

    let wins = 0;
    let losses = 0;
    let confirmedMatches = 0;

    (matchRows ?? []).forEach((match) => {
      const mySide = mySideByMatchId.get(match.id);
      if (!mySide || (match.winner_side !== 1 && match.winner_side !== 2)) {
        return;
      }
      confirmedMatches += 1;
      if (match.winner_side === mySide) {
        wins += 1;
      } else {
        losses += 1;
      }
    });

    const winRate = confirmedMatches
      ? Math.round((wins / confirmedMatches) * 100)
      : 0;

    setStats({
      confirmedMatches,
      wins,
      losses,
      winRate
    });

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Home</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchRatings}
          disabled={isLoading}
        >
          <Text style={styles.refreshText}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/(tabs)/report-match")}
        >
          <Text style={styles.actionButtonText}>Report match</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButtonSecondary}
          onPress={() => router.push("/(tabs)/pending")}
        >
          <Text style={styles.actionButtonSecondaryText}>
            Pending confirmations
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButtonSecondary}
          onPress={() => router.push("/(tabs)/history")}
        >
          <Text style={styles.actionButtonSecondaryText}>Match history</Text>
        </TouchableOpacity>
      </View>

      <Scoreboard />

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Stats</Text>
        <View style={styles.statsRow}>
          <View style={styles.statsItem}>
            <Text style={styles.statsValue}>{stats.confirmedMatches}</Text>
            <Text style={styles.statsLabel}>Confirmed</Text>
          </View>
          <View style={styles.statsItem}>
            <Text style={styles.statsValue}>{stats.wins}</Text>
            <Text style={styles.statsLabel}>Wins</Text>
          </View>
          <View style={styles.statsItem}>
            <Text style={styles.statsValue}>{stats.losses}</Text>
            <Text style={styles.statsLabel}>Losses</Text>
          </View>
          <View style={styles.statsItem}>
            <Text style={styles.statsValue}>{stats.winRate}%</Text>
            <Text style={styles.statsLabel}>Win rate</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading your ratings...</Text>
        </View>
      ) : ratings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.subtitle}>No sport ratings yet.</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/(onboarding)/sports-and-levels")}
          >
            <Text style={styles.primaryButtonText}>Set up my sports</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.list}>
          {ratings.map((rating) => (
            <View key={rating.sport} style={styles.card}>
              <Text style={styles.cardTitle}>{formatSportLabel(rating.sport)}</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Level</Text>
                <Text style={styles.detailValue}>
                  {formatLevel(rating.level)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reliability</Text>
                <Text style={styles.detailValue}>
                  {formatReliability(rating.reliability)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 16
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: {
    fontSize: 28,
    fontWeight: "700"
  },
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#111"
  },
  refreshText: {
    color: "#fff",
    fontWeight: "600"
  },
  actionRow: {
    gap: 12
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center"
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600"
  },
  actionButtonSecondary: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    alignItems: "center"
  },
  actionButtonSecondaryText: {
    color: "#111",
    fontWeight: "600"
  },
  statsCard: {
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    padding: 16,
    gap: 12
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  statsItem: {
    flexGrow: 1,
    minWidth: 120,
    paddingVertical: 8
  },
  statsValue: {
    fontSize: 20,
    fontWeight: "700"
  },
  statsLabel: {
    color: "#666"
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 32
  },
  loadingText: {
    color: "#666"
  },
  emptyState: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 32
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center"
  },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#111"
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600"
  },
  list: {
    gap: 16
  },
  card: {
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    padding: 16,
    gap: 12
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  detailLabel: {
    color: "#666"
  },
  detailValue: {
    fontWeight: "600"
  }
});
