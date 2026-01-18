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

type SportRating = {
  sport: string;
  level: number | null;
  reliability: number | null;
  source: string | null;
  matches_competitive: number | null;
  updated_at: string | null;
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

export default function HomeScreen() {
  const [ratings, setRatings] = useState<SportRating[]>([]);
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
